import React from 'react';
import { 
  X, 
  Play, 
  Cpu, 
  Zap, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  GitMerge, 
  Code2, 
  CheckCircle2,
  RefreshCw,
  Sparkles,
  GitBranch,
  History,
  Activity
} from 'lucide-react';
import { AutomationFeedback, AutomationProposal } from '../types';
import { ProposalFeedbackWidget } from './ProposalFeedbackWidget';
import { RealTimeHealthMonitor } from './RealTimeHealthMonitor';

interface Props {
  proposal: AutomationProposal | null;
  onClose: () => void;
  onExecute: (proposal: AutomationProposal) => void;
  isExecuting: boolean;
  onOpenVersions?: (proposal: AutomationProposal) => void;
  userCreditBalance?: number;
  onOpenBilling?: () => void;
  onSubmitFeedback: (proposalId: string, feedback: {
    accuracyRating: number;
    usefulnessRating: number;
    category: AutomationFeedback['category'];
    comment: string;
    userEmail?: string;
  }) => Promise<void>;
}

export const ProposalDetailModal: React.FC<Props> = ({
  proposal,
  onClose,
  onExecute,
  isExecuting,
  onOpenVersions,
  userCreditBalance = 50,
  onOpenBilling,
  onSubmitFeedback,
}) => {
  if (!proposal) return null;

  const currentVersion = proposal.currentVersionId || (proposal.versions && proposal.versions.length > 0 ? proposal.versions[proposal.versions.length - 1].versionId : 'v1.0');
  const versionCount = proposal.versions ? proposal.versions.length : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-4 pr-8">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0 mt-1">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                {proposal.id}
              </span>
              <span className="text-xs text-slate-400">
                Generated via {proposal.generatedBy || 'Substrate State Correlator'}
              </span>
              <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/50">
                Confidence: {proposal.confidenceScore}%
              </span>

              {/* Version pill & action */}
              <button
                onClick={() => onOpenVersions && onOpenVersions(proposal)}
                className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 hover:bg-purple-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Version Control & Diff Comparator"
              >
                <GitBranch className="h-3 w-3 text-purple-400" />
                <span>{currentVersion}</span>
                <span className="text-purple-400/70 font-normal">({versionCount} revs)</span>
              </button>

              {/* Real-time Health Indicator Pill */}
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Health: 99.6% Success</span>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {proposal.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {proposal.summary}
            </p>
          </div>
        </div>

        {/* Target Apps Badges */}
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
          <span className="text-xs text-slate-400">Connected Services:</span>
          {proposal.targetApps.map((app) => (
            <span
              key={app}
              className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              {app}
            </span>
          ))}
        </div>

        {/* Value Metrics Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              Expected Time Saved
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {proposal.expectedTimeSaved}
            </div>
            <div className="text-[11px] text-slate-500">Based on {proposal.occurrenceCount} recurring runs</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              Direct Cost Reduction
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {proposal.costSavingsEstimate}
            </div>
            <div className="text-[11px] text-slate-500">Manual labor &amp; SLA risk avoided</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              Execution Reliability
            </div>
            <div className="text-lg font-bold font-mono text-purple-300">
              {proposal.reliabilityRate}
            </div>
            <div className="text-[11px] text-slate-500">Bypasses fragile UI/DOM layer</div>
          </div>
        </div>

        {/* Bottleneck Diagnostic */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 mb-6 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Operational Bottleneck Identified
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {proposal.bottleneckDetected}
          </p>
        </div>

        {/* Trigger Definition */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            Trigger Rule &amp; Preconditions (Zero DOM Scraping)
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-900">
              <span className="font-mono text-cyan-300 font-semibold">{proposal.trigger.sourceApp} Trigger</span>
              <span className="font-mono text-slate-400">{proposal.trigger.endpoint}</span>
            </div>
            <div className="text-slate-300 font-mono text-[11px]">
              <span className="text-slate-500">Condition: </span>
              {proposal.trigger.condition}
            </div>
            <div className="text-slate-400 text-[11px]">
              <span className="text-slate-500">Observed State Delta: </span>
              {proposal.trigger.observedDelta}
            </div>
          </div>
        </div>

        {/* State Correlation Mapping Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <GitMerge className="h-3.5 w-3.5 text-indigo-400" />
            Input-to-State Correlation Model
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                  <th className="p-3 font-medium">Source API State Field</th>
                  <th className="p-3 font-medium">Target MCP Tool</th>
                  <th className="p-3 font-medium">Target Parameter</th>
                  <th className="p-3 font-medium">Correlation Transformation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {proposal.correlationModel.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30">
                    <td className="p-3 text-cyan-300">{item.sourceField}</td>
                    <td className="p-3 text-indigo-300">{item.targetTool}</td>
                    <td className="p-3 text-amber-300">{item.targetParam}</td>
                    <td className="p-3 text-slate-400 font-sans text-xs">{item.transformation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MCP Direct Execution Sequence */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-emerald-400" />
            Model Context Protocol (MCP) Execution Sequence
          </h3>
          <div className="space-y-3">
            {proposal.mcpExecutionPlan.map((step) => (
              <div key={step.step} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold text-[10px] font-mono">
                      {step.step}
                    </span>
                    <span className="font-semibold text-white">{step.description}</span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    {step.connectorId}.{step.tool}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(step.sampleParams, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Health Monitor Section */}
        <div className="mb-6">
          <RealTimeHealthMonitor proposal={proposal} />
        </div>

        {/* User Feedback & AI Learning Loop */}
        <div className="mb-6">
          <ProposalFeedbackWidget
            proposal={proposal}
            onSubmitFeedback={onSubmitFeedback}
            onOpenVersions={() => onOpenVersions && onOpenVersions(proposal)}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Zero mouse coordinate clicks • 100% Deterministic RPC
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>

            {(() => {
              const stepCost = Math.max(1, proposal.mcpExecutionPlan?.length || 3);
              const hasCredits = userCreditBalance >= stepCost;

              if (!hasCredits) {
                return (
                  <button
                    onClick={onOpenBilling}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    title={`Automation costs ${stepCost} credits, but current balance is ${userCreditBalance}. Click to subscribe or refill.`}
                  >
                    <Zap className="h-4 w-4 fill-current" />
                    <span>Refill Credits (Costs {stepCost} • Bal: {userCreditBalance})</span>
                  </button>
                );
              }

              return (
                <button
                  onClick={() => onExecute(proposal)}
                  disabled={isExecuting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Executing MCP Plan...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>One-Click Execute (MCP Connectors)</span>
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-950 text-[10px] font-mono border border-cyan-400/40 text-cyan-200">
                        ⚡ {stepCost} Credits
                      </span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
