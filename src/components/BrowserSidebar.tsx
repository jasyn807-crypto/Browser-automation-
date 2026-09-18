import React from 'react';
import { 
  Zap, 
  Cpu, 
  Play, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  X, 
  ExternalLink,
  Filter,
  GitBranch,
  MessageSquare,
  Search
} from 'lucide-react';
import { AutomationProposal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposals: AutomationProposal[];
  onSelectProposal: (proposal: AutomationProposal) => void;
  onExecuteProposal: (proposal: AutomationProposal) => void;
  isExecutingId: string | null;
  onOpenAiAnalysis: () => void;
  onOpenFilters?: () => void;
  onOpenVersions?: (proposal: AutomationProposal) => void;
  userCreditBalance?: number;
  onOpenBilling?: () => void;
}

export const BrowserSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  proposals,
  onSelectProposal,
  onExecuteProposal,
  isExecutingId,
  onOpenAiAnalysis,
  onOpenFilters,
  onOpenVersions,
  userCreditBalance = 50,
  onOpenBilling,
}) => {
  const [sidebarSearchQuery, setSidebarSearchQuery] = React.useState('');

  // Full-text search across proposal titles, summaries, and targeted application names
  const filteredProposals = proposals.filter((prop) => {
    if (!sidebarSearchQuery.trim()) return true;
    const q = sidebarSearchQuery.toLowerCase().trim();
    const titleMatch = prop.title.toLowerCase().includes(q);
    const summaryMatch = prop.summary.toLowerCase().includes(q);
    const targetAppsMatch = prop.targetApps?.some((a) => a.toLowerCase().includes(q));
    const bottleneckMatch = prop.bottleneckDetected?.toLowerCase().includes(q);
    return titleMatch || summaryMatch || targetAppsMatch || bottleneckMatch;
  });

  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[calc(100vh-4rem)] sticky top-16 z-30 shadow-2xl overflow-hidden">
      {/* Sidebar Top / Extension Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/30">
            <Zap className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">Substrate Extension</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
                Sidebar
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Passive API Learning Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              title="Passive Learning Filter Settings"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onOpenAiAnalysis}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            title="Synthesize New Proposal via Gemini AI"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Bar */}
      <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="text-slate-400">
          State Correlation: <strong className="text-cyan-300 font-mono">99.1% Confidence</strong>
        </div>
        <div className="text-emerald-400 flex items-center gap-1 font-mono">
          <ShieldCheck className="h-3 w-3" />
          0 DOM elements used
        </div>
      </div>

      {/* Proposals Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            Automation Proposals
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 text-cyan-300 font-mono">
              {filteredProposals.length}
            </span>
          </h4>
          <span className="text-[10px] text-slate-400">Autonomously Learnt</span>
        </div>

        {/* Sidebar Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <input
            id="sidebar-proposals-search"
            type="text"
            value={sidebarSearchQuery}
            onChange={(e) => setSidebarSearchQuery(e.target.value)}
            placeholder="Search proposals by title, summary, app..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
          {sidebarSearchQuery && (
            <button
              id="sidebar-proposals-search-clear"
              onClick={() => setSidebarSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {filteredProposals.length === 0 ? (
          <div 
            id="sidebar-proposals-empty"
            className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2 mt-2"
          >
            <Search className="h-5 w-5 text-slate-500 mx-auto" />
            <div className="text-xs font-semibold text-slate-300">No proposals found</div>
            <p className="text-[11px] text-slate-400">
              No automations matched &ldquo;{sidebarSearchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSidebarSearchQuery('')}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline pt-1 cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredProposals.map((prop) => {
          const isExecuting = isExecutingId === prop.id;

          return (
            <div
              key={prop.id}
              className={`p-4 rounded-xl border transition-all ${
                prop.status === 'ACTIVE'
                  ? 'bg-slate-950/90 border-emerald-500/40 shadow-emerald-500/5'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between text-[10px] mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {prop.targetApps.map((app) => {
                    const isMatched = sidebarSearchQuery.trim() && app.toLowerCase().includes(sidebarSearchQuery.toLowerCase().trim());
                    return (
                      <span
                        key={app}
                        className={`px-1.5 py-0.5 rounded border font-semibold ${
                          isMatched
                            ? 'bg-cyan-950 text-cyan-200 border-cyan-500/80 ring-1 ring-cyan-500/40'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        {app}
                      </span>
                    );
                  })}
                </div>

                <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                  prop.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                }`}>
                  {prop.status === 'ACTIVE' ? 'Autonomous Active' : 'Proposal Ready'}
                </span>
              </div>

              {/* Title */}
              <h5 className="text-xs font-semibold text-slate-100 leading-snug mb-2">
                {prop.title}
              </h5>

              {/* Bottleneck Callout */}
              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-200/90 mb-3 space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Bottleneck Detected
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {prop.bottleneckDetected}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    Time Saved
                  </div>
                  <div className="font-bold text-slate-100 font-mono mt-0.5">
                    {prop.expectedTimeSaved}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    Value Added
                  </div>
                  <div className="font-bold text-emerald-400 font-mono mt-0.5">
                    {prop.costSavingsEstimate}
                  </div>
                </div>
              </div>

              {/* MCP Tool Step Summary & Version Info */}
              <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between border-t border-slate-900 pt-2 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-300 font-bold">{prop.mcpExecutionPlan.length} MCP tools</span>
                  {prop.feedbacks && prop.feedbacks.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-sans flex items-center gap-0.5">
                      • <MessageSquare className="h-2.5 w-2.5 text-amber-400" /> {prop.feedbacks.length}
                    </span>
                  )}
                </div>

                {onOpenVersions ? (
                  <button
                    onClick={() => onOpenVersions(prop)}
                    className="text-[10px] text-purple-300 hover:text-purple-200 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                    title="View Version History"
                  >
                    <GitBranch className="h-2.5 w-2.5" />
                    <span>{prop.currentVersionId || 'v1.0'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-purple-300 font-mono">
                    {prop.currentVersionId || 'v1.0'}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {(() => {
                const stepCost = Math.max(1, prop.mcpExecutionPlan?.length || 3);
                const hasCredits = userCreditBalance >= stepCost;

                return (
                  <div className="flex items-center gap-2">
                    {hasCredits ? (
                      <button
                        onClick={() => onExecuteProposal(prop)}
                        disabled={isExecuting}
                        className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isExecuting ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Executing MCP...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>One-Click Execute</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-400/30 text-[10px] text-cyan-200 font-mono">
                              ⚡{stepCost}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={onOpenBilling}
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title={`Execution requires ${stepCost} credits, but you have ${userCreditBalance}. Click to subscribe or refill.`}
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>Refill Credits (Need {stepCost})</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectProposal(prop)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      title="View Full Rules & MCP Graph"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <button
          onClick={onOpenBilling}
          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          title="Click to view subscription and credit usage ledger"
        >
          <Zap className="h-3 w-3 fill-current" />
          <span className="font-semibold font-mono">{userCreditBalance} Credits Available</span>
        </button>
        <button
          onClick={onOpenAiAnalysis}
          className="text-cyan-400 hover:underline flex items-center gap-1"
        >
          <span>Ask Gemini AI</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </aside>
  );
};
