# Substrate Browser Agent — Extension + Agent Loop

A working MVP replica of the Pluno.ai architecture (see `../pluno-research/PLUNO_REVERSE_ENGINEERING.md`), built into this repo.

## What exists now

```
extension/                  ← load this folder in Chrome (chrome://extensions → Load unpacked)
  manifest.json             MV3: debugger, webRequest, tabs, scripting, storage, sidePanel, <all_urls>
  background.js             The browser broker: CDP executor + webRequest capture + agent loop client
                            + activity buffering (5-min alarm upload) + replay executor + scheduler poller
  sidepanel.html/js         Chat UI + automation-suggestion cards + learned-tools library
  content.js                Behavior recorder: a11y-shaped events (role/name/ancestors, never values)
                            + page-info provider

server.ts (added endpoints)
  POST /api/agent/start     Begin a run: {instruction, page} → {runId}
  POST /api/agent/step      Feed observation → next action (execute_code | final | error)
  GET  /api/agent/runs      Introspection for the web dashboard
  POST /api/activity/ingest Behavior events in → stored (capped 20k, origin-block aware)
  GET  /api/activity/summary Per-origin event counts
  GET  /api/suggestions     Repetition scan (n-gram detection) → LLM-synthesized automation cards
  POST /api/suggestions/:id/dismiss
  + LLM provider layer      frellm (http://127.0.0.1:31415/v1, model "auto") first, Gemini fallback
```

## How it works (the Pluno mechanism, end to end)

### Task execution ("10x faster via APIs")
1. You type a task in the sidepanel (opens via the extension icon).
2. Background attaches `chrome.debugger` to the active tab ("is being debugged" banner appears — same as Pluno).
3. It captures a **page snapshot** (simplified DOM outline + visible text — the Pluno `Sn()/fs()` algorithm) and starts a run on the server.
4. The server's LLM (frellm `auto` → Gemini fallback) sees the snapshot + task and responds with an action:
   - `execute_code` → runs **in the page's MAIN world** via `Runtime.evaluate` with `userGesture:true` — same origin, same cookies, same session as you. The agent calls the site's own APIs (`fetch('/api/...')`) instead of clicking the UI.
   - `final` → done, answer shown in the panel.
   - `error` → task impossible, reason shown.
5. While code runs, **webRequest capture** records the page's real XHR/fetch traffic (method, URL, status — auth/cookie headers stripped, bodies kept local) and feeds it back as "network evidence" so the model can mirror the exact API calls the site itself makes.
6. Loop repeats (max 10 steps), debugger detaches 2s after completion.

### Behavior learning ("observes your regular use, suggests automations")
1. The content script records clicks, form submits, field changes (fact of change only — never values), enter keys, and navigations as **accessibility-shaped targets**: `{role, name, ancestors}`.
2. Events flush to the background worker (every 20 events / 25 s), which buffers up to 5,000 and uploads to the server on a 5-minute alarm — origin-match guarded.
3. Server builds per-origin interaction sequences and runs **n-gram repetition detection** (2–6 step patterns repeated ≥3×, deduplicated, top 6 per origin).
4. For each new repeated pattern, the LLM synthesizes an **automation suggestion** (title, summary, trigger, complete agent instruction, minutes saved) — grounded strictly in observed data.
5. Suggestions appear in the sidepanel (auto-refresh every 60 s, green flash on new): **Run now** feeds the instruction to the agent loop; **Dismiss** hides it.

## The "Beyond Pluno" layer (all live & verified)

| Feature | What it does | Pluno status |
|---|---|---|
| **Learned-tool library + deterministic replay** | Every successful run can be frozen ("Save as tool" button). The frozen API sequence replays with **zero LLM calls** — instant, free, identical every time. | Pays LLM credits on every single run (their business model depends on it) |
| **Verification receipts** | Replays capture before/after page snapshots; the server diffs them and reports ✓ verified state changes. Proof-of-execution, not "agent claims it worked". | Not present |
| **Scheduled headless runs** | Tools run on a timer (chrome.alarms) against your live session — even in a background tab. | Scheduling exists but runs cost credits |
| **Self-healing tools** | 2 consecutive replay failures auto-flags the tool for relearn; a fresh agent run refreshes the frozen code. | n/a |
| **MCP server** (`POST /mcp`) | Every learned tool is exposed over MCP (JSON-RPC over HTTP). Registered in Hermes — your other agents call your browser workflows directly. | They only consume other agents' calls; they don't export tools |
| **Cross-site runs + replays** | Replayer finds/opens the right tab by origin and executes there; sequences can span sites in one run. | Single-tab CDP sessions only |
| **Per-origin recording controls** | Block-list for what gets recorded (ingest-side), per-site. | Has blocked-services; parity here |

### New server endpoints

```
POST /api/tools/freeze          Successful run → frozen, replayable tool
GET  /api/tools                 Library list
DEL  /api/tools/:id
GET  /api/tools/:id/replay      Frozen code + verification spec (zero LLM)
POST /api/tools/:id/receipt     Replay result + before/after snapshots → verified diff
POST /api/tools/:id/schedule    Set/clear schedule (everyMinutes)
GET  /api/tools/due             Scheduled tools due now (extension poller)
POST /api/tools/:id/relearn     Self-healing: fresh agent run refreshes frozen code
POST /mcp                       MCP JSON-RPC: initialize / tools/list / tools/call
GET  /api/jobs/queued           Extension polls MCP-triggered replays
GET|POST /api/jobs/:id          Job status / completion
GET  /api/settings/origins      Blocked origins
POST /api/settings/origins/block | /unblock
```

## Setup

1. **Server**:
   ```bash
   cd Browser-automation-
   # .env needs: FREELLM_BASE_URL, FREELLM_MODEL, and FREELLM_API_KEY (or GEMINI_API_KEY)
   export HERMES_CUSTOM_FREELLM_API_KEY=...   # if inheriting from Hermes env
   npm run dev                                # http://localhost:3000
   ```
2. **Extension**: Chrome → `chrome://extensions` → Developer mode ON → **Load unpacked** → select `extension/`
3. **MCP registration** (done): `hermes mcp add substrate --url http://127.0.0.1:3000/mcp` — learned tools appear to Hermes agents.

## Verified (2026-09-18)

- `tsc --noEmit` clean; all extension JS syntax-validated; manifest validated.
- **Agent loop (frellm)**: snapshot task → instant `final`; network-evidence task → correct `execute_code` mirroring the observed XHR (`fetch('/api/weather?city=london')`).
- **Behavior learning**: 30 simulated HubSpot events (4× repeat workflow) → repetition detector caught the 6-step pattern → frellm synthesized "Automate HubSpot Contacts deal filter and CSV export" (~8 min/wk).
- **Replay/receipts/scheduler/MCP**: freeze → replay plan (zero LLM) → receipt verified state diff → 30-min schedule claimed → MCP initialize/tools-list/tools-call → job queued → extension completion → job done.
- **Origin controls**: blocked-origin events dropped at ingest (counter verified after fix).
- **MCP in Hermes**: `hermes mcp test substrate` → connected, tool discovered ("hubspot-export — deterministic replay, zero LLM").
- Gemini path returns 429 (prepaid credits depleted) — frellm is the primary brain.

## Security notes

- Behavior events carry role/name/ancestors only — never field values, HTML, or coordinates.
- Auth/cookie headers stripped from network evidence before it leaves the browser.
- Request bodies stay local.
- Origin-match guard on activity ingestion; per-origin block list.
- Execution is same-user, same-origin by construction.
- NOT built yet: approval/interaction gates (Pluno's `interaction.act`), MutationObserver-based proactive triggers.

## Phase 3+ roadmap

1. Approval gate for destructive actions (Pluno's `interaction` protocol)
2. Proactive triggers: MutationObserver watches page-state predicates → auto-suggest/launch (Pluno's `watchPageState`)
3. WebSocket instead of poll-based endpoints (Pluno uses `wss://.../runtime/ws`)
4. Wire billing credits per run into the existing ledger endpoints
5. In-page floating widget (port of the repo's existing React modals)
