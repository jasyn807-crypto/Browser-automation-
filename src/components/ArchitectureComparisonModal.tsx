import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Zap, 
  Flame, 
  ShieldCheck, 
  ExternalLink,
  Cpu
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureComparisonModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">The Paradigm Shift: Direct API State vs DOM Scraping</h2>
            <p className="text-xs text-slate-400">
              Why Substrate bypasses brittle HTML selectors and screen coordinates in favor of native software layer correlation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Fragile DOM Way */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-red-900/30 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4" />
                  Fragile Screen Scraping
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 font-mono">
                  38% Reliability
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/20">
                  <p className="font-semibold text-red-200 mb-1">Clicking Screen Coordinates (x: 420, y: 780)</p>
                  <p className="text-slate-400">
                    Fails immediately on responsive resizing, different DPI zoom levels, OS window scaling, or browser banner popups.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/20">
                  <p className="font-semibold text-red-200 mb-1">CSS Selectors &amp; DOM Trees</p>
                  <p className="text-slate-400">
                    Selectors like <code className="text-red-300 font-mono">button.css-19v8-btn</code> break on every single CI/CD deployment when styled-components or Tailwind regenerates class hashes.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/20">
                  <p className="font-semibold text-red-200 mb-1">Shadow DOM, IFrames &amp; Virtual Lists</p>
                  <p className="text-slate-400">
                    Modern rich web apps (Linear, Notion, HubSpot) use virtualized scroll tables. Scrapers cannot find off-screen nodes in the DOM.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-red-900/30 flex items-center justify-between text-[11px] text-red-400">
              <span>Failure Mode: Continuous maintenance hell</span>
              <span>Avg Lifespan: ~11 days</span>
            </div>
          </div>

          {/* Substrate Direct API & State Engine */}
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Substrate Direct API &amp; MCP
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 font-mono">
                  99.98% Reliability
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/20">
                  <p className="font-semibold text-emerald-200 mb-1">Passive Network &amp; API Interception</p>
                  <p className="text-slate-400">
                    Hooks directly into the browser's background network fetch pipeline and web socket channels behind the UI, capturing deterministic REST &amp; GraphQL frames.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/20">
                  <p className="font-semibold text-emerald-200 mb-1">Underlying Data State Correlation</p>
                  <p className="text-slate-400">
                    Correlates semantic state diffs (e.g. <code className="text-emerald-300 font-mono">invoice.status: past_due</code>) with user business intent rather than pixels.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/20">
                  <p className="font-semibold text-emerald-200 mb-1">Pre-trained MCP Connectors (50,000+ Tools)</p>
                  <p className="text-slate-400">
                    Executes directly via Model Context Protocol JSON-RPC tool contracts (HubSpot, Linear, Stripe, Jira, Notion) without rendering or touching the browser DOM.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-900/30 flex items-center justify-between text-[11px] text-emerald-400">
              <span>Failure Mode: Self-healing schema validation</span>
              <span>Avg Lifespan: Production-grade SLA</span>
            </div>
          </div>
        </div>

        {/* Technical Callout */}
        <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">How Substrate Learns: </span>
            As you interact with SaaS tools, the extension builds an automation graph by correlating user inputs (form values, search filters, modal confirms) with the resulting API request payloads and state diffs. When recurring sequence thresholds are crossed, an automation proposal is generated with zero manual prompt engineering.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Got it, Return to Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
