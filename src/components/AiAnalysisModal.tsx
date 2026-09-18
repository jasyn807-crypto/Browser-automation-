import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Cpu, 
  Zap, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  Layers,
  Radio
} from 'lucide-react';
import { AutomationProposal, ObservedApiEvent } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  observedEvents: ObservedApiEvent[];
  onProposalGenerated: (proposal: AutomationProposal) => void;
  userCreditBalance?: number;
  onOpenBilling?: () => void;
  onCreditDeducted?: (newBalance: number) => void;
}

export const AiAnalysisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  observedEvents,
  onProposalGenerated,
  userCreditBalance = 50,
  onOpenBilling,
  onCreditDeducted,
}) => {
  const [scenarioTitle, setScenarioTitle] = useState('Stripe Payment Delinquency & Customer Churn Prevention');
  const [appDomain, setAppDomain] = useState('Fintech & CRM');
  const [customGoal, setCustomGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets = [
    {
      title: 'Stripe Payment Delinquency & Customer Churn Prevention',
      domain: 'Stripe + Linear + HubSpot',
      goal: 'Observe recurring customer card decline frames, correlate to Linear triage issue and flag HubSpot CRM deal as Contract Risk.',
    },
    {
      title: 'HubSpot Enterprise Deal Won to Notion Onboarding & Jira Sprint Epic',
      domain: 'HubSpot + Notion + Jira',
      goal: 'When deal stage updates to Closed-Won with amount > $25k, automatically provision client portal in Notion and engineering epic in Jira.',
    },
    {
      title: 'Linear P1 Incident to GitHub Hotfix Branch & Jira Status Sync',
      domain: 'Linear + GitHub + Jira',
      goal: 'Correlate high priority customer bugs filed in Linear with automated GitHub hotfix branches and customer service desk status mirroring.',
    },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle,
          appDomain,
          customGoal,
          observations: observedEvents.slice(0, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setErrorMsg(data.message || 'Insufficient credits. Upgrade to a paid monthly subscription to run AI synthesis.');
          return;
        }
        throw new Error(data.error || 'Failed to synthesize proposal');
      }

      if (data.success && data.plan) {
        if (data.billing?.creditBalance !== undefined && onCreditDeducted) {
          onCreditDeducted(data.billing.creditBalance);
        }

        const newProposal: AutomationProposal = {
          id: `prop-${Math.floor(Math.random() * 800) + 100}`,
          title: data.plan.title,
          summary: data.plan.summary,
          targetApps: data.plan.targetApps || ['Stripe', 'Linear', 'HubSpot'],
          bottleneckDetected: data.plan.bottleneckDetected,
          expectedTimeSaved: data.plan.expectedTimeSaved || '16.4 hrs / month',
          costSavingsEstimate: data.plan.costSavingsEstimate || '$2,100 / month',
          reliabilityRate: data.plan.reliabilityRate || '99.98%',
          trigger: data.plan.trigger,
          correlationModel: data.plan.correlationModel || [],
          mcpExecutionPlan: data.plan.mcpExecutionPlan || [],
          status: 'PROPOSED',
          confidenceScore: 98.9,
          occurrenceCount: 14,
          generatedBy: data.generatedBy === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash Engine' : 'Substrate Correlation Model',
          createdAt: 'Just now',
        };

        onProposalGenerated(newProposal);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to synthesize proposal');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error communicating with analysis service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Synthesize Automation Model with Gemini AI
            </h2>
            <p className="text-xs text-slate-400">
              Correlates observed background network traffic with underlying data mutations
            </p>
          </div>
        </div>

        {/* Live Observed Context Badge */}
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Radio className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              Feeding <strong className="text-cyan-300 font-mono">{observedEvents.length} live intercepted frames</strong> into correlation model
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            Direct API Hooks
          </span>
        </div>

        {/* Presets */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Workflow Pattern to Analyze
          </label>
          <div className="space-y-2">
            {presets.map((p) => (
              <div
                key={p.title}
                onClick={() => {
                  setScenarioTitle(p.title);
                  setAppDomain(p.domain);
                  setCustomGoal(p.goal);
                }}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  scenarioTitle === p.title
                    ? 'bg-blue-950/40 border-blue-500/70 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{p.title}</span>
                  <span className="font-mono text-[10px] text-cyan-300">{p.domain}</span>
                </div>
                <p className="text-[11px] text-slate-400">{p.goal}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-1.5 mb-6">
          <label className="text-xs font-semibold text-slate-300">
            Specific Correlation Objective (Optional)
          </label>
          <textarea
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            rows={2}
            placeholder="e.g. Detect when invoices are over $10k and automatically trigger high-touch account manager outreach in Slack."
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Zero DOM screen-scraping • Generates native MCP plan
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>

            {userCreditBalance < 5 ? (
              <button
                type="button"
                onClick={onOpenBilling}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Refill Credits (Synthesis costs 5 • Bal: {userCreditBalance})</span>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Automation Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Synthesize Proposal</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-400/30 text-[10px] text-blue-200 font-mono">
                      ⚡ 5 Credits
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
