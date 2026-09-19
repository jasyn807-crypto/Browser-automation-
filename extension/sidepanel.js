// Substrate Agent sidepanel UI
const $log = document.getElementById("log");
const $form = document.getElementById("composer");
const $input = document.getElementById("instruction");
const $send = document.getElementById("send");
const $status = document.getElementById("status");
const $busy = document.getElementById("busy");

let port = null;
let running = false;

function connectPort() {
  port = chrome.runtime.connect({ name: "substrate-panel" });
  port.onMessage.addListener((msg) => {
    if (msg.type === "run.step") {
      addStep(msg.step);
    } else if (msg.type === "run.finished") {
      finishRun(msg.run);
    }
  });
  port.onDisconnect.addListener(() => setTimeout(connectPort, 1000));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function addMsg(cls, text, meta) {
  const m = el("div", `msg ${cls}`, text);
  if (meta) m.appendChild(el("div", "meta", meta));
  $log.appendChild(m);
  $log.scrollTop = $log.scrollHeight;
  return m;
}

function addStep(step) {
  // step: { thought, action: {type, javascript?}, ... }
  const m = el("div", "msg agent");
  m.appendChild(el("div", null, step.thought || "(no thought)"));
  if (step.action?.type === "execute_code" && step.action.javascript) {
    const c = el("pre", "code", step.action.javascript);
    m.appendChild(el("div", "meta", "executing in page (CDP main world):"));
    m.appendChild(c);
  }
  $log.appendChild(m);
  $log.scrollTop = $log.scrollHeight;
}

function finishRun(run) {
  running = false;
  $send.disabled = false;
  $input.disabled = false;
  $busy.classList.remove("on");
  if (run.status === "completed") {
    const m = el("div", "msg agent result");
    m.appendChild(el("div", null, run.result || "(empty result)"));
    m.appendChild(el("div", "meta", `completed in ${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s · ${run.steps.length} steps`));
    $log.appendChild(m);
  } else {
    addMsg("error", `Task failed: ${run.error || "unknown error"}`);
  }
  $log.scrollTop = $log.scrollHeight;
}

async function checkServer() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "panel.serverStatus" });
    if (res?.ok) {
      $status.textContent = "server online";
      $status.className = "ok";
    } else {
      $status.textContent = "server offline (npm run dev)";
      $status.className = "err";
    }
  } catch {
    $status.textContent = "background unreachable";
    $status.className = "err";
  }
}

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const instruction = $input.value.trim();
  if (!instruction || running) return;
  running = true;
  $send.disabled = true;
  $input.disabled = true;
  $input.value = "";
  $busy.classList.add("on");
  addMsg("user", instruction);
  try {
    const res = await chrome.runtime.sendMessage({ type: "panel.run", instruction });
    if (!res?.ok) {
      finishRun({ status: "failed", error: res?.error || "run failed", steps: [], startedAt: Date.now(), finishedAt: Date.now() });
    }
    // success path handled by port messages (run.step / run.finished)
  } catch (err) {
    finishRun({ status: "failed", error: String(err), steps: [], startedAt: Date.now(), finishedAt: Date.now() });
  }
});

connectPort();
checkServer();
setInterval(checkServer, 15000);
addMsg("agent", "Substrate Browser Agent ready.\n\n1. Make sure the Substrate server is running (npm run dev in Browser-automation-).\n2. Open any website in this window.\n3. Describe a task — the agent will call the site's APIs directly instead of clicking the UI.\n\nIt also records your clicks/forms (roles & labels only, never values) and suggests automations for repeated work — see the suggestions bar below.");

// ---------------------------------------------------------------------------
// Automation suggestions (behavior learning)
// ---------------------------------------------------------------------------

const $sugToggle = document.getElementById("suggestions-toggle");
const $sugList = document.getElementById("suggestions");
let suggestionsOpen = false;
let suggestionCount = 0;

$sugToggle.addEventListener("click", () => {
  suggestionsOpen = !suggestionsOpen;
  $sugList.style.display = suggestionsOpen ? "flex" : "none";
  $sugToggle.textContent = `${suggestionsOpen ? "▾" : "▸"} Automation suggestions (${suggestionCount})`;
});

async function fetchSuggestions() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "panel.suggestions" });
    if (!res?.ok) return;
    const list = res.suggestions ?? [];
    const prev = suggestionCount;
    suggestionCount = list.length;
    $sugToggle.textContent = `${suggestionsOpen ? "▾" : "▸"} Automation suggestions (${suggestionCount})`;
    if (suggestionCount > prev && prev >= 0 && !suggestionsOpen) {
      $sugToggle.style.color = "var(--ok)";
      setTimeout(() => ($sugToggle.style.color = ""), 8000);
    }
    $sugList.replaceChildren();
    if (list.length === 0) {
      const empty = el("div", null, "No suggestions yet. Keep browsing — patterns detected after ~3+ repetitions appear here.");
      empty.style.cssText = "font-size:11px;color:var(--muted);padding:6px 0";
      $sugList.appendChild(empty);
      return;
    }
    for (const s of list) {
      const card = el("div", "suggestion");
      card.appendChild(el("h3", null, s.title));
      card.appendChild(el("p", null, s.summary));
      card.appendChild(el("p", null, `Trigger: ${s.triggerDescriptionShort || s.triggerDescription?.split(" | ")[0] || "observed pattern"}`));
      card.appendChild(el("div", "stats", `seen ${s.occurrences}× on ${s.targetSite} · saves ~${s.estimatedMinutesSaved} min/week`));
      const row = el("div", "row");
      const runBtn = el("button", null, "Run now");
      runBtn.addEventListener("click", async () => {
        runBtn.disabled = true;
        runBtn.textContent = "running…";
        try {
          const r = await chrome.runtime.sendMessage({
            type: "panel.runSuggestion",
            title: s.title,
            instruction: s.instruction,
          });
          if (!r?.ok) addMsg("error", `Suggestion run failed: ${r?.error || "unknown"}`);
        } catch (err) {
          addMsg("error", `Suggestion run failed: ${err}`);
        }
      });
      const disBtn = el("button", "ghost", "Dismiss");
      disBtn.addEventListener("click", async () => {
        try {
          await fetch(`${await serverBase()}/api/suggestions/${s.id}/dismiss`, { method: "POST" });
          card.remove();
          suggestionCount = Math.max(0, suggestionCount - 1);
          $sugToggle.textContent = `${suggestionsOpen ? "▾" : "▸"} Automation suggestions (${suggestionCount})`;
        } catch {
          /* server offline — just remove locally */
          card.remove();
        }
      });
      row.appendChild(runBtn);
      row.appendChild(disBtn);
      card.appendChild(row);
      $sugList.appendChild(card);
    }
  } catch {
    /* background not ready */
  }
}

async function serverBase() {
  return "http://127.0.0.1:3000"; // kept in sync with background SERVER
}

fetchSuggestions();
setInterval(fetchSuggestions, 60000);

// ---------------------------------------------------------------------------
// Learned tools (deterministic replay library)
// ---------------------------------------------------------------------------

const $toolsToggle = document.getElementById("tools-toggle");
const $toolsList = document.getElementById("tools");
let toolsOpen = false;
let lastSuccessfulRunId = null;

$toolsToggle.addEventListener("click", () => {
  toolsOpen = !toolsOpen;
  $toolsList.style.display = toolsOpen ? "flex" : "none";
  $toolsToggle.textContent = `${toolsOpen ? "▾" : "▸"} Learned tools (${$toolsList.children.length}) — replay free, forever`;
  if (toolsOpen) fetchTools();
});

async function fetchTools() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "panel.listTools" });
    if (!res?.ok) return;
    const tools = res.tools ?? [];
    $toolsToggle.textContent = `${toolsOpen ? "▾" : "▸"} Learned tools (${tools.length}) — replay free, forever`;
    $toolsList.replaceChildren();
    if (tools.length === 0) {
      const empty = el("div", null, "No learned tools yet. Run a task, then click 'Save as tool' on the result to freeze it — future runs replay with zero LLM calls.");
      empty.style.cssText = "font-size:11px;color:var(--muted);padding:6px 0";
      $toolsList.appendChild(empty);
      return;
    }
    for (const t of tools) {
      const card = el("div", "suggestion");
      card.appendChild(el("h3", null, `${t.name}${t.needsRelearn ? " ⚠ needs relearn" : ""}`));
      card.appendChild(el("p", null, t.description));
      const stats = el(
        "div",
        "stats",
        `${t.runs} runs · ${t.llmFreeRuns} free replays · last: ${t.lastStatus}` +
          (t.lastReceipt?.verified ? " ✓ verified" : "") +
          (t.scheduleEveryMinutes ? ` · every ${t.scheduleEveryMinutes}m` : "")
      );
      card.appendChild(stats);
      if (t.lastReceipt?.changedLines?.length) {
        const d = el("div", "stats", "receipt: " + t.lastReceipt.changedLines.slice(0, 3).join(" / ").slice(0, 160));
        card.appendChild(d);
      }
      const row = el("div", "row");
      const runBtn = el("button", null, "Run now");
      runBtn.addEventListener("click", async () => {
        runBtn.disabled = true;
        runBtn.textContent = "replaying…";
        try {
          const r = await chrome.runtime.sendMessage({ type: "panel.replayTool", toolId: t.id });
          if (r?.ok) {
            addMsg("agent", `Replay of "${t.name}" ${r.receipt?.ok ? "succeeded" : "failed"}. ${r.receipt?.verified ? "✓ State change verified." : ""}${r.receipt?.changedLines?.length ? "\nReceipt:\n" + r.receipt.changedLines.join("\n") : ""}`, `0 LLM calls · deterministic replay`);
          } else {
            addMsg("error", `Replay failed: ${r?.error || "unknown"}`);
          }
        } catch (err) {
          addMsg("error", `Replay failed: ${err}`);
        }
        runBtn.disabled = false;
        runBtn.textContent = "Run now";
      });
      const schedBtn = el("button", "ghost", t.scheduleEveryMinutes ? "Unschedule" : "Schedule…");
      schedBtn.addEventListener("click", async () => {
        if (t.scheduleEveryMinutes) {
          await chrome.runtime.sendMessage({ type: "panel.scheduleTool", toolId: t.id, everyMinutes: 0 });
          fetchTools();
          return;
        }
        const mins = prompt("Run this tool every how many minutes?", "60");
        if (mins) {
          await chrome.runtime.sendMessage({ type: "panel.scheduleTool", toolId: t.id, everyMinutes: Number(mins) });
          fetchTools();
        }
      });
      row.appendChild(runBtn);
      row.appendChild(schedBtn);
      card.appendChild(row);
      $toolsList.appendChild(card);
    }
  } catch {
    /* background not ready */
  }
}

fetchTools();
setInterval(fetchTools, 30000);

// Track the last successful run so "Save as tool" can freeze it
port.onMessage.addListener((msg) => {
  if (msg.type === "run.finished" && msg.run?.status === "completed") {
    lastSuccessfulRunId = msg.run.id;
    const save = el("button", null, "Save as tool (freeze — future runs are free)");
    save.style.cssText = "margin:4px 0 8px; font-size:11px; padding:6px 10px; border-radius:6px; background:var(--ok); color:#06281c; border:none; cursor:pointer; font-weight:600;";
    save.addEventListener("click", async () => {
      save.disabled = true;
      save.textContent = "freezing…";
      try {
        const r = await chrome.runtime.sendMessage({ type: "panel.freezeRun", runId: lastSuccessfulRunId });
        if (r?.ok) {
          addMsg("agent", `Tool saved: "${r.tool.name}". It now replays deterministically — zero LLM calls, schedulable, exposed via MCP.`, "learned-tool library");
          save.remove();
          fetchTools();
        } else {
          addMsg("error", `Freeze failed: ${r?.error || "run had no code steps"}`);
          save.disabled = false;
          save.textContent = "Save as tool (freeze — future runs are free)";
        }
      } catch (err) {
        addMsg("error", `Freeze failed: ${err}`);
      }
    });
    $log.appendChild(save);
    $log.scrollTop = $log.scrollHeight;
  }
});
