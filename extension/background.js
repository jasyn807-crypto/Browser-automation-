// Substrate Browser Agent — background service worker.
// Architecture mirrors Pluno (see PLUNO_REVERSE_ENGINEERING.md):
//   1. webRequest capture pipeline -> network evidence (tool-synthesis fuel)
//   2. CDP executor: agent JS runs in the page's MAIN world via chrome.debugger
//   3. Poll-based agent loop against the local Substrate server (/api/agent/*)

const SERVER = "http://127.0.0.1:3000";
const EXECUTE_TIMEOUT_MS = 30000;
const MAX_CAPTURED_REQUESTS = 300;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  connected: false,
  sessionId: null,
  activeTabId: null,
  runs: new Map(), // runId -> {status, steps, result, error, startedAt}
};

// ---------------------------------------------------------------------------
// Network capture (Pluno: webRequest + CDP Network events -> network.batch)
// ---------------------------------------------------------------------------

const capturedRequests = new Map(); // key `${tabId}:${requestId}` -> record
let captureActive = false; // true while an agent run is executing

function urlTruncate(url, max = 2000) {
  return typeof url === "string" ? url.slice(0, max) : "";
}

function headerBucket(headers) {
  if (!headers) return undefined;
  const out = {};
  for (const h of headers) if (h.name) out[h.name.toLowerCase()] = h.value ?? "";
  return out;
}

function getOrCreateRecord(tabId, requestId) {
  const key = `${tabId}:${requestId}`;
  if (!capturedRequests.has(key)) {
    if (capturedRequests.size >= MAX_CAPTURED_REQUESTS) {
      const oldest = capturedRequests.keys().next().value;
      capturedRequests.delete(oldest);
    }
    capturedRequests.set(key, {
      requestId: String(requestId),
      tabId,
      url: "",
      method: "GET",
      resourceType: "",
      startedAt: new Date().toISOString(),
    });
  }
  return capturedRequests.get(key);
}

function enableNetworkCapture() {
  captureActive = true;
}

function disableNetworkCapture() {
  captureActive = false;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!captureActive || details.tabId < 0) return;
    const rec = getOrCreateRecord(details.tabId, details.requestId);
    rec.url = urlTruncate(details.url);
    rec.method = details.method;
    rec.resourceType = details.type;
    if (details.requestBody?.raw?.length) {
      try {
        const dec = new TextDecoder();
        rec.requestBody = dec
          .decode(details.requestBody.raw[0])
          .slice(0, 4000);
      } catch {
        /* binary body — skip */
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!captureActive || details.tabId < 0) return;
    const rec = getOrCreateRecord(details.tabId, details.requestId);
    rec.requestHeaders = headerBucket(details.requestHeaders);
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!captureActive || details.tabId < 0) return;
    const rec = getOrCreateRecord(details.tabId, details.requestId);
    rec.statusCode = details.statusCode;
    rec.completedAt = new Date().toISOString();
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

function takeNetworkEvidence(tabId) {
  const events = [];
  for (const rec of capturedRequests.values()) {
    if (rec.tabId === tabId || tabId == null) {
      // Strip credential-bearing headers before anything leaves the browser.
      const sanitized = { ...rec };
      if (sanitized.requestHeaders) {
        const h = { ...sanitized.requestHeaders };
        delete h["authorization"];
        delete h["cookie"];
        delete h["set-cookie"];
        delete h["x-api-key"];
        delete h["x-auth-token"];
        sanitized.requestHeaders = h;
      }
      delete sanitized.requestBody; // bodies stay local in MVP
      events.push(sanitized);
    }
  }
  return events.slice(-60); // keep prompt budget sane
}

// ---------------------------------------------------------------------------
// CDP executor (Pluno: Cy.executeCode -> Runtime.evaluate in MAIN world)
// ---------------------------------------------------------------------------

const attachedTabs = new Set();

async function sendCommand(target, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, method, params ?? {}, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

async function ensureAttached(tabId) {
  if (attachedTabs.has(tabId)) return;
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error(
      `The target tab (${tab.url || "unknown url"}) is not an automatable web page. Switch to a regular http(s) site tab and try again.`
    );
  }
  await chrome.debugger.attach({ tabId }, "1.3");
  await sendCommand({ tabId }, "Page.enable", {});
  await sendCommand({ tabId }, "Runtime.enable", {});
  attachedTabs.add(tabId);
}

async function detachAll() {
  for (const tabId of attachedTabs) {
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      /* already detached */
    }
  }
  attachedTabs.clear();
}

chrome.debugger.onDetach.addListener((source) => {
  if (typeof source.tabId === "number") attachedTabs.delete(source.tabId);
});

// Injected helper — stringified into Runtime.evaluate, runs in the page MAIN
// world with the user's origin + cookies (the Pluno moat).
function pageHelper() {
  const logs = [];
  const wrap = (level) => (...args) => {
    logs.push({ level, args: args.map((a) => safeStr(a)) });
    console[level](...args);
  };
  const safeStr = (a) => {
    try {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "string") return a;
      return JSON.stringify(a)?.slice(0, 500) ?? String(a);
    } catch {
      return String(a);
    }
  };
  const orig = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = wrap("log");
  console.info = wrap("info");
  console.warn = wrap("warn");
  console.error = wrap("error");

  // Simplified DOM outline (Pluno Sn()/fs() approach): curated tags + a11y attrs
  const OUTLINE_TAGS = new Set([
    "main", "nav", "header", "footer", "section", "article", "aside", "form",
    "table", "tr", "th", "td", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5",
    "h6", "p", "a", "button", "label", "input", "textarea", "select", "option",
    "dialog", "iframe",
  ]);
  const INTERACTIVE_ROLES = new Set([
    "button", "link", "checkbox", "radio", "switch", "combobox", "textbox",
    "tab", "menuitem", "option",
  ]);
  const SKIP_TAGS = new Set(["script", "style", "noscript", "template", "meta", "link", "svg", "path"]);
  const ATTRS = ["role", "aria-label", "aria-current", "aria-selected", "aria-expanded", "aria-checked", "aria-pressed", "name", "type", "placeholder", "title", "data-testid"];

  function serialize(root, budget = 7000) {
    const lines = [];
    let count = 0;
    const walk = (el, depth) => {
      if (lines.join("\n").length >= budget || count >= 800) return;
      const tag = el.tagName ? el.tagName.toLowerCase() : "";
      if (!tag || SKIP_TAGS.has(tag)) return;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      count++;
      const attrs = [];
      for (const a of ATTRS) {
        const v = el.getAttribute?.(a);
        if (v) attrs.push(`${a}="${v.slice(0, 80)}"`);
      }
      let label = "";
      if (["a", "button", "label", "th", "td", "option", "summary", "h1", "h2", "h3", "h4", "h5", "h6", "p"].includes(tag)) {
        label = (el.innerText || "").trim().slice(0, 60);
      }
      const line = "  ".repeat(depth) + `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${label ? ` label="${label}"` : ""}>`;
      lines.push(line);
      for (const child of el.children || []) walk(child, depth + 1);
    };
    walk(root, 0);
    return lines.join("\n");
  }

  function getPageSnapshot() {
    const outline = document.body ? serialize(document.body) : "";
    const visibleText = (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 4000);
    const selected = window.getSelection()?.toString() || "";
    return `URL: ${location.href}\nTitle: ${document.title}\n\nSimplified DOM outline:\n${outline}\n\nVisible page text:\n${visibleText}${selected ? `\n\nSelected text:\n${selected}` : ""}`;
  }

  globalThis.substrate = { getPageSnapshot };
  return { logs, orig };
}

async function executeCode(tabId, javascript) {
  await ensureAttached(tabId);
  const expression = `(async () => {
    const helper = (${pageHelper.toString()})();
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction("substrate", ${JSON.stringify(javascript)});
      const result = await fn(globalThis.substrate);
      helper.orig.log && (console.log = helper.orig.log, console.info = helper.orig.info, console.warn = helper.orig.warn, console.error = helper.orig.error);
      return { ok: true, result: result === undefined ? null : JSON.parse(JSON.stringify(result ?? null)), console: helper.logs };
    } catch (e) {
      console.log = helper.orig.log; console.info = helper.orig.info; console.warn = helper.orig.warn; console.error = helper.orig.error;
      return { ok: false, exception: { name: e.name, message: String(e.message || e), stack: e.stack }, console: helper.logs };
    }
  })()`;
  const response = await sendCommand({ tabId }, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
    allowUnsafeEvalBlockedByCSP: true,
  });
  if (response?.exceptionDetails) {
    return {
      ok: false,
      exception: {
        message: response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text ?? "Runtime.evaluate failed",
      },
    };
  }
  return response?.result?.value ?? { ok: false, exception: { message: "No by-value result" } };
}

async function getPageSnapshot(tabId) {
  await ensureAttached(tabId);
  const r = await executeCode(tabId, "return substrate.getPageSnapshot();");
  return r;
}

// ---------------------------------------------------------------------------
// Agent loop (client side of the Substrate server's /api/agent/run)
// ---------------------------------------------------------------------------

async function getActiveTab() {
  // Prefer the focused tab, but skip chrome://, edge://, file:// etc. —
  // those can't be scripted. Fall back to the most recently accessed
  // http(s) tab in the window so running from chrome://extensions works.
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const usable = tabs.filter(
    (t) => typeof t.id === "number" && t.url && /^https?:/i.test(t.url)
  );
  const active = tabs.find((t) => t.active && usable.includes(t));
  if (active) return active;
  if (usable.length > 0) {
    usable.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    return usable[0];
  }
  throw new Error(
    "No usable website tab in this window. Open a regular http(s) site (chrome:// and edge:// pages can't be automated) and try again."
  );
}

async function serverPost(path, body) {
  const res = await fetch(SERVER + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function runAgentTask(instruction) {
  const tab = await getActiveTab();
  const runId = crypto.randomUUID();
  const run = {
    id: runId,
    instruction,
    tabId: tab.id,
    tabUrl: tab.url,
    status: "running",
    steps: [],
    startedAt: Date.now(),
  };
  state.runs.set(runId, run);
  broadcast({ type: "run.started", run: runView(run) });

  enableNetworkCapture();
  let final = null;
  try {
    // Kick off server-side loop
    const start = await serverPost("/api/agent/start", {
      instruction,
      page: { url: tab.url, title: tab.title ?? "" },
    });
    if (!start.ok) throw new Error(start.error || "Server failed to start run");

    // Seed with a page snapshot
    const snap = await getPageSnapshot(tab.id);
    const step0 = await serverPost("/api/agent/step", {
      runId: start.runId,
      observation: {
        kind: "page_snapshot",
        ok: snap.ok,
        snapshot: snap.ok ? snap.result : null,
        error: snap.ok ? null : snap.exception?.message,
      },
    });
    run.steps.push(step0.step);
    broadcast({ type: "run.step", runId, step: step0.step });

    // Loop: server returns either an execute_code action or a final answer
    let action = step0.next;
    let guard = 0;
    while (action && action.type === "execute_code" && guard < 10) {
      guard++;
      const exec = await executeCode(tab.id, action.javascript);
      const evidence = takeNetworkEvidence(tab.id);
      const stepRes = await serverPost("/api/agent/step", {
        runId: start.runId,
        observation: {
          kind: "code_result",
          ok: exec.ok,
          result: exec.result ?? null,
          exception: exec.exception ?? null,
          console: (exec.console ?? []).slice(0, 20),
          networkEvidence: evidence,
        },
      });
      run.steps.push(stepRes.step);
      broadcast({ type: "run.step", runId, step: stepRes.step });
      action = stepRes.next;
    }

    if (action && action.type === "final") {
      final = action;
      run.status = "completed";
      run.result = action.answer;
    } else if (action && action.type === "error") {
      run.status = "failed";
      run.error = action.message;
    } else {
      run.status = "failed";
      run.error = "Agent loop ended without a final answer (step limit).";
    }
  } catch (err) {
    run.status = "failed";
    run.error = String(err.message || err);
  } finally {
    disableNetworkCapture();
    run.finishedAt = Date.now();
    broadcast({ type: "run.finished", run: runView(run) });
    // Detach debugger after a short grace period so the banner doesn't flash
    setTimeout(() => detachAll(), 2000);
  }
  return runView(run);
}

function runView(run) {
  return {
    id: run.id,
    instruction: run.instruction,
    tabUrl: run.tabUrl,
    status: run.status,
    steps: run.steps,
    result: run.result ?? null,
    error: run.error ?? null,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Behavior recorder buffering (Pluno: RawActivity recorder/uploader)
// content.js sends a11y-shaped chunks; we buffer per-origin and upload to the
// server on a periodic alarm. Identity/origin gating happens here.
// ---------------------------------------------------------------------------

const activityBuffer = []; // {origin, documentUrl, documentTitle, events[]}
const ACTIVITY_MAX_EVENTS = 5000;
const ACTIVITY_ALARM = "substrate-activity-upload";

chrome.alarms.create(ACTIVITY_ALARM, { periodInMinutes: 5 });

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "activity.chunk" && sender.tab?.url) {
    try {
      const origin = new URL(sender.tab.url).hostname;
      if (origin !== new URL(msg.documentUrl || sender.tab.url).hostname) return; // origin match guard
      activityBuffer.push(...msg.events.map((e) => ({ ...e, tabOrigin: origin })));
      if (activityBuffer.length > ACTIVITY_MAX_EVENTS) {
        activityBuffer.splice(0, activityBuffer.length - ACTIVITY_MAX_EVENTS);
      }
    } catch {
      /* malformed — drop */
    }
  }
});

async function flushActivity() {
  if (activityBuffer.length === 0) return;
  const events = activityBuffer.splice(0, activityBuffer.length);
  try {
    const res = await fetch(SERVER + "/api/activity/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      // Re-buffer on transient failure (drop overflow)
      activityBuffer.unshift(...events.slice(-ACTIVITY_MAX_EVENTS));
    }
  } catch {
    activityBuffer.unshift(...events.slice(-ACTIVITY_MAX_EVENTS));
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ACTIVITY_ALARM) flushActivity();
});

// ---------------------------------------------------------------------------
// Sidepanel / UI messaging
// ---------------------------------------------------------------------------

const ports = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "substrate-panel") return;
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
  port.postMessage({ type: "hello", server: SERVER });
});

function broadcast(msg) {
  for (const p of ports) {
    try {
      p.postMessage(msg);
    } catch {
      ports.delete(p);
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case "panel.run":
          sendResponse({ ok: true, run: await runAgentTask(msg.instruction) });
          break;
        case "panel.snapshot":
          sendResponse(await getPageSnapshot((await getActiveTab()).id));
          break;
        case "panel.serverStatus": {
          const res = await fetch(SERVER + "/api/health");
          sendResponse({ ok: res.ok, status: res.status });
          break;
        }
        case "panel.suggestions": {
          const res = await fetch(SERVER + "/api/suggestions");
          const data = await res.json();
          sendResponse({ ok: res.ok, ...data });
          break;
        }
        case "panel.runSuggestion": {
          // Run a suggested automation against the active (or most recent usable) tab
          const tab = await getActiveTab();
          // Suggested automations carry a task instruction + optional seed JS
          const instruction = `[Automation suggestion run] ${msg.title}. ${msg.instruction}`;
          sendResponse({ ok: true, run: await runAgentTask(instruction) });
          break;
        }
        default:
          sendResponse({ ok: false, error: `Unknown message: ${msg?.type}` });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err.message || err) });
    }
  })();
  return true; // async sendResponse
});

// Open sidepanel on action click
chrome.action.onClicked.addListener(async (tab) => {
  state.activeTabId = tab.id;
  await chrome.sidePanel.open({ tabId: tab.id });
});

console.info("[Substrate] background service worker ready");

// ---------------------------------------------------------------------------
// REPLAY ENGINE + SCHEDULER + MCP JOBS (server-driven, zero LLM per replay)
// (serverGet/serverPost already defined in the agent-loop section above)
// ---------------------------------------------------------------------------

async function serverGet(path) {
  const res = await fetch(SERVER + path);
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}

// Find (or open) a tab for a tool's origin so replays run against your live
// session even when the tab isn't focused.
async function tabForOrigin(origin) {
  const tabs = await chrome.tabs.query({ url: `https://${origin}/*` });
  if (tabs.length > 0) return tabs[0];
  const tab = await chrome.tabs.create({ url: `https://${origin}/`, active: false });
  // Wait for the page to settle before executing code
  await new Promise((r) => setTimeout(r, 4000));
  return tab;
}

// Deterministic replay: fetch frozen code, capture before-snapshot, execute,
// capture after-snapshot, report receipt. ZERO LLM calls.
async function replayTool(toolId) {
  const plan = await serverGet(`/api/tools/${toolId}/replay`);
  const tab = await tabForOrigin(plan.tool.origin);
  const before = await executeCode(tab.id, "return substrate.getPageSnapshot();");
  const exec = await executeCode(tab.id, plan.code);
  const after = await executeCode(tab.id, "return substrate.getPageSnapshot();");
  const receipt = await serverPost(`/api/tools/${toolId}/receipt`, {
    ok: exec.ok,
    result: exec.result ?? null,
    exception: exec.exception ?? null,
    beforeSnapshot: before.ok ? before.result : null,
    afterSnapshot: after.ok ? after.result : null,
  });
  broadcast({ type: "replay.finished", toolId, receipt: receipt.receipt });
  return receipt.receipt;
}

// Scheduler + MCP job poller: every 60s check for due tools and queued jobs.
const REPLAY_POLL_ALARM = "substrate-replay-poll";
chrome.alarms.create(REPLAY_POLL_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REPLAY_POLL_ALARM) return;
  try {
    // 1) Scheduled tools that are due
    const due = await serverGet("/api/tools/due");
    for (const t of due.tools ?? []) {
      replayTool(t.id).catch((err) =>
        console.warn(`[Substrate] scheduled replay failed for ${t.name}:`, err.message)
      );
    }
    // 2) Queued MCP jobs
    const jobs = await serverGet("/api/jobs/queued");
    for (const j of jobs.jobs ?? []) {
      replayTool(j.toolId)
        .then((receipt) => serverPost(`/api/jobs/${j.id}/complete`, { ok: receipt?.ok, result: receipt ?? null }))
        .catch((err) => serverPost(`/api/jobs/${j.id}/complete`, { ok: false, result: { error: String(err) } }));
    }
  } catch (err) {
    // Server offline — retry on next alarm
  }
});

// Run a tool's replay on demand (sidepanel "Run" button)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "panel.replayTool") {
      try {
        sendResponse({ ok: true, receipt: await replayTool(msg.toolId) });
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    } else if (msg?.type === "panel.listTools") {
      try {
        sendResponse(await serverGet("/api/tools"));
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    } else if (msg?.type === "panel.scheduleTool") {
      try {
        sendResponse(await serverPost(`/api/tools/${msg.toolId}/schedule`, { everyMinutes: msg.everyMinutes }));
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    } else if (msg?.type === "panel.freezeRun") {
      try {
        sendResponse(await serverPost("/api/tools/freeze", { runId: msg.runId }));
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    }
  })();
  return true;
});
