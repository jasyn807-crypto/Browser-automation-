// Substrate Browser Agent — content script + behavior recorder.
// Mirrors Pluno's recorder (PLUNO_REVERSE_ENGINEERING.md §4 "Behavior recorder"):
//   capture-phase listeners, accessibility-shaped targets (role/name/ancestors —
//   never values, never HTML), chunked delivery to the background worker.

(() => {
  if (window.__substrateRecorderInstalled) return;
  window.__substrateRecorderInstalled = true;

  const NAME_CAP = 60;
  const ANCESTOR_CAP = 5;
  const FLUSH_EVERY_EVENTS = 20;
  const FLUSH_INTERVAL_MS = 25000;

  let events = [];
  let lastUrl = location.href;

  // ---- a11y-shaped target serializer (Pluno rn()/hn()/mn()) ----
  function roleOf(el) {
    const explicit = el.getAttribute?.("role")?.trim();
    if (explicit) return explicit;
    if (el instanceof HTMLAnchorElement && el.href) return "link";
    if (el instanceof HTMLButtonElement) return "button";
    if (el instanceof HTMLFormElement) return "form";
    if (el instanceof HTMLSelectElement) return "combobox";
    if (el instanceof HTMLTextAreaElement) return "textbox";
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") return "checkbox";
      if (el.type === "radio") return "radio";
      if (el.type === "file") return "file-input";
      return "textbox";
    }
    return el.tagName?.toLowerCase() ?? "unknown";
  }

  function nameOf(el) {
    const labelledby = el.getAttribute?.("aria-labelledby");
    if (labelledby) {
      const names = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
      if (names) return names.slice(0, NAME_CAP);
    }
    const aria = el.getAttribute?.("aria-label")?.trim();
    if (aria) return aria.slice(0, NAME_CAP);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder) return el.placeholder.slice(0, NAME_CAP);
      const labels = el.labels ? [...el.labels] : [];
      if (labels.length) return (labels[0].textContent || "").trim().slice(0, NAME_CAP);
    }
    const title = el.getAttribute?.("title")?.trim();
    if (title) return title.slice(0, NAME_CAP);
    const text = (el.innerText || el.value || "").trim();
    return text ? text.slice(0, NAME_CAP) : "";
  }

  function serializeTarget(el) {
    const ancestors = [];
    let node = el.parentElement;
    while (node && ancestors.length < ANCESTOR_CAP) {
      const r = roleOf(node);
      const n = nameOf(node);
      if (r || n) ancestors.push(`${r}:${n}`.slice(0, 80));
      node = node.parentElement;
    }
    return { role: roleOf(el).slice(0, 40), name: nameOf(el), ancestors };
  }

  // Ignore events originating from our own sidepanel/widget (none yet) or
  // non-element targets.
  function validTarget(e) {
    return e.target instanceof Element && !e.target.closest?.("[data-substrate-ui]");
  }

  function record(type, e, extra = {}) {
    try {
      events.push({
        type,
        at: Date.now(),
        url: location.href,
        ...serializeTarget(e.target),
        ...extra,
      });
      if (events.length >= FLUSH_EVERY_EVENTS) flush();
    } catch {
      /* never break the host page */
    }
  }

  function flush() {
    if (events.length === 0) return;
    const chunk = events;
    events = [];
    chrome.runtime
      .sendMessage({
        type: "activity.chunk",
        origin: location.origin,
        documentUrl: location.href,
        documentTitle: document.title,
        events: chunk,
      })
      .catch(() => {});
  }

  // ---- listeners (capture phase, passive where possible) ----
  document.addEventListener(
    "click",
    (e) => {
      if (validTarget(e)) record("click", e);
    },
    true
  );
  document.addEventListener(
    "submit",
    (e) => {
      if (validTarget(e)) record("form_submit", e);
    },
    true
  );
  document.addEventListener(
    "change",
    (e) => {
      if (!validTarget(e)) return;
      const t = e.target;
      const isField =
        t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;
      if (!isField) return;
      // Never record values — only that the field changed (Pluno posture).
      record(t instanceof HTMLInputElement && t.type === "file" ? "file_selected" : "field_change", e);
    },
    true
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (!validTarget(e)) return;
      if (e.key === "Enter") record("enter", e);
    },
    true
  );

  // Same-document navigation awareness
  const pushUrl = () => {
    if (location.href !== lastUrl) {
      events.push({ type: "navigation", at: Date.now(), url: location.href, previousUrl: lastUrl, role: "page", name: document.title, ancestors: [] });
      lastUrl = location.href;
    }
  };
  setInterval(pushUrl, 2000);

  window.addEventListener("pagehide", flush, { once: true });
  setInterval(flush, FLUSH_INTERVAL_MS);

  // ---- page info responder (unchanged) ----
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "content.getPageInfo") {
      sendResponse({
        ok: true,
        url: location.href,
        title: document.title,
        textSample: (document.body?.innerText || "").slice(0, 3000),
      });
    } else if (msg?.type === "activity.setCaptureActive") {
      // The background gates capture; when off we simply stop flushing.
      window.__substrateCaptureActive = msg.active === true;
    }
    return false;
  });

  window.__substrateCaptureActive = true;
})();
