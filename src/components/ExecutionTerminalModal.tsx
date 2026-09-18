import React from 'react';
import { 
  X, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Copy, 
  Check, 
  Layers, 
  RefreshCw,
  Cpu
} from 'lucide-react';
import { ExecutionRun } from '../types';

interface Props {
  run: ExecutionRun | null;
  onClose: () => void;
}

export const ExecutionTerminalModal: React.FC<Props> = ({ run, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!run) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(run, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  One-Click MCP Execution Completed
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  ALL_STEPS_SUCCEEDED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Execution ID: {run.executionId} • Plan: {run.planTitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer mr-6"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Log' : 'Copy Trace'}</span>
          </button>
        </div>

        {/* Execution Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Total MCP Latency</div>
            <div className="text-base font-bold font-mono text-cyan-400">
              {run.summary.totalDurationMs}ms
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Human Time Saved</div>
            <div className="text-base font-bold font-mono text-emerald-400">
              ~{Math.round(run.summary.timeSavedSeconds / 60)} minutes
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">DOM Scraping Reliance</div>
            <div className="text-base font-bold font-mono text-purple-400 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              0% (Pure API)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">MCP Protocol</div>
            <div className="text-base font-bold font-mono text-amber-400">
              v{run.summary.mcpProtocolVersion}
            </div>
          </div>
        </div>

        {/* Step-by-Step Execution Stream */}
        <div className="space-y-4 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            Model Context Protocol JSON-RPC Tool Invocations
          </h4>

          {run.executedSteps.map((step) => (
            <div key={step.stepNumber} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center font-mono font-bold text-[11px]">
                    {step.stepNumber}
                  </span>
                  <span className="font-semibold text-white">{step.description}</span>
                  <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    {step.connectorId}.{step.tool}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <span>{step.durationMs}ms</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold text-[10px]">
                    200 OK
                  </span>
                </div>
              </div>

              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>tools/call payload</span>
                    <span className="text-slate-500">JSON-RPC 2.0</span>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-cyan-300 overflow-x-auto max-h-36 leading-relaxed text-[11px]">
                    {JSON.stringify(step.rpcRequest, null, 2)}
                  </pre>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Direct API Result</span>
                    <span className="text-emerald-400">State Synced</span>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-emerald-300 overflow-x-auto max-h-36 leading-relaxed text-[11px]">
                    {JSON.stringify(step.rpcResponse, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-cyan-400" />
            Direct API Execution: No browser windows were rendered, no HTML elements parsed.
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
