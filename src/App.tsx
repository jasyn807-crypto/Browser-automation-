import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { WebWorkspaceSimulator } from './components/WebWorkspaceSimulator';
import { NetworkInspector } from './components/NetworkInspector';
import { BrowserSidebar } from './components/BrowserSidebar';
import { ProposalDetailModal } from './components/ProposalDetailModal';
import { ExecutionTerminalModal } from './components/ExecutionTerminalModal';
import { ArchitectureComparisonModal } from './components/ArchitectureComparisonModal';
import { McpRegistryModal } from './components/McpRegistryModal';
import { IntegrationsSyncModal } from './components/IntegrationsSyncModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { FilterConfigModal } from './components/FilterConfigModal';
import { VersionControlModal } from './components/VersionControlModal';
import { BillingSubscriptionModal } from './components/BillingSubscriptionModal';

import { 
  INITIAL_OBSERVED_EVENTS, 
  INITIAL_PROPOSALS, 
  MCP_CONNECTORS_CATALOG, 
  CONNECTED_TOOLS,
  DEFAULT_FILTER_CONFIG
} from './data/mockData';
import { INITIAL_BILLING_ACCOUNT } from './data/billingData';
import { 
  AutomationFeedback,
  AutomationProposal, 
  AutomationVersion,
  ClientBillingAccount,
  ConnectedTool, 
  ExecutionRun, 
  McpConnector, 
  ObservedApiEvent,
  PassiveFilterConfig
} from './types';
import { evaluateFilter } from './utils/filterEngine';

import { 
  Zap, 
  Cpu, 
  Radio, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  Sparkles, 
  Clock, 
  DollarSign,
  AlertTriangle,
  GitMerge,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  GitBranch,
  MessageSquare,
  Search,
  X
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'stream' | 'proposals' | 'mcp' | 'integrations'>('workspace');
  const [observedEvents, setObservedEvents] = useState<ObservedApiEvent[]>(INITIAL_OBSERVED_EVENTS);
  const [proposals, setProposals] = useState<AutomationProposal[]>(INITIAL_PROPOSALS);
  const [connectors, setConnectors] = useState<McpConnector[]>(MCP_CONNECTORS_CATALOG);
  const [tools, setTools] = useState<ConnectedTool[]>(CONNECTED_TOOLS);

  // Passive Learning Filter Engine State
  const [filterConfig, setFilterConfig] = useState<PassiveFilterConfig>(DEFAULT_FILTER_CONFIG);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Version Control State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionTargetProposal, setVersionTargetProposal] = useState<AutomationProposal | null>(null);

  // Modals & Drawers
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<AutomationProposal | null>(null);
  const [executionRun, setExecutionRun] = useState<ExecutionRun | null>(null);
  const [isExecutingId, setIsExecutingId] = useState<string | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Client Billing & Credit Balance State
  const [billingAccount, setBillingAccount] = useState<ClientBillingAccount>(INITIAL_BILLING_ACCOUNT);

  // Sync with server billing state on load
  React.useEffect(() => {
    fetch('/api/billing/account')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.account) {
          setBillingAccount(data.account);
        }
      })
      .catch((err) => {
        console.warn('Could not sync initial billing account from server:', err);
      });
  }, []);

  // Notification toast
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  // Proposals Search & Application Filter State
  const [proposalSearchQuery, setProposalSearchQuery] = useState('');
  const [proposalAppFilter, setProposalAppFilter] = useState('All');

  // Compute unique target apps across all proposals for quick filter chips
  const allProposalTargetApps: string[] = Array.from(
    new Set<string>(proposals.flatMap((p) => p.targetApps || []))
  ).sort();

  // Full-text search across proposal titles, summaries, and targeted application names
  const filteredProposals = proposals.filter((prop) => {
    if (proposalAppFilter !== 'All') {
      const hasApp = prop.targetApps?.some(
        (app) => app.toLowerCase() === proposalAppFilter.toLowerCase()
      );
      if (!hasApp) return false;
    }

    if (!proposalSearchQuery.trim()) return true;
    const q = proposalSearchQuery.toLowerCase().trim();

    const titleMatch = prop.title.toLowerCase().includes(q);
    const summaryMatch = prop.summary.toLowerCase().includes(q);
    const targetAppsMatch = prop.targetApps?.some((app) =>
      app.toLowerCase().includes(q)
    );
    const bottleneckMatch = prop.bottleneckDetected?.toLowerCase().includes(q);

    return titleMatch || summaryMatch || targetAppsMatch || bottleneckMatch;
  });

  const showNotification = (msg: string) => {
    setRecentNotification(msg);
    setTimeout(() => setRecentNotification(null), 4000);
  };

  // Add newly intercepted event with intelligent filtering & redaction
  const handleEmitEvent = (event: ObservedApiEvent) => {
    const evalResult = evaluateFilter(event, filterConfig);

    // Update telemetry capture statistics
    setFilterConfig((prev) => ({
      ...prev,
      captureStats: {
        totalEvaluated: prev.captureStats.totalEvaluated + 1,
        captured: evalResult.allowed ? prev.captureStats.captured + 1 : prev.captureStats.captured,
        dropped: !evalResult.allowed ? prev.captureStats.dropped + 1 : prev.captureStats.dropped,
        redactedFields: prev.captureStats.redactedFields + evalResult.redactedCount,
      },
    }));

    if (!evalResult.allowed) {
      showNotification(`[Passive Filter Dropped] ${evalResult.reason || 'Frame excluded by active rule'}`);
      return;
    }

    setObservedEvents((prev) => [evalResult.sanitizedEvent, ...prev]);

    if (evalResult.redactedCount > 0) {
      showNotification(`[Passive Observer] Intercepted ${event.method} ${event.endpoint} (${evalResult.redactedCount} sensitive fields redacted)`);
    } else {
      showNotification(`[Passive Observer] Intercepted ${event.method} ${event.endpoint} from ${event.app}`);
    }
  };

  // Submit User Feedback & Trigger AI Learning Refinement Loop
  const handleSubmitFeedback = async (
    proposalId: string, 
    feedback: {
      accuracyRating: number;
      usefulnessRating: number;
      category: AutomationFeedback['category'];
      comment: string;
      userEmail?: string;
    }
  ) => {
    const target = proposals.find((p) => p.id === proposalId);
    if (!target) return;

    const newFeedback: AutomationFeedback = {
      id: `fb-${Date.now()}`,
      proposalId,
      timestamp: 'Just now',
      accuracyRating: feedback.accuracyRating,
      usefulnessRating: feedback.usefulnessRating,
      category: feedback.category,
      comment: feedback.comment,
      userEmail: feedback.userEmail || 'operator@substrate.local',
      aiAdaptationApplied: false,
    };

    try {
      const res = await fetch('/api/refine-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: target,
          feedback: newFeedback,
        }),
      });

      const data = await res.json();
      if (data.success && data.proposal) {
        const refinedProposal: AutomationProposal = data.proposal;
        setProposals((prev) => prev.map((p) => (p.id === proposalId ? refinedProposal : p)));
        
        if (selectedProposal?.id === proposalId) {
          setSelectedProposal(refinedProposal);
        }
        if (versionTargetProposal?.id === proposalId) {
          setVersionTargetProposal(refinedProposal);
        }

        showNotification(`AI Learning Refinement: ${data.adaptationSummary || 'Model recalibrated and new version committed'}`);
      } else {
        // Fallback local update if offline
        const updatedProposal = {
          ...target,
          feedbacks: [...(target.feedbacks || []), newFeedback],
        };
        setProposals((prev) => prev.map((p) => (p.id === proposalId ? updatedProposal : p)));
        if (selectedProposal?.id === proposalId) {
          setSelectedProposal(updatedProposal);
        }
        showNotification('Feedback recorded and saved locally.');
      }
    } catch (err) {
      console.error('Feedback refinement error:', err);
      showNotification('Feedback saved.');
    }
  };

  // Rollback / Revert Proposal to Historical Version
  const handleRevertVersion = (proposalId: string, version: AutomationVersion) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;

        const currentNum = parseFloat((p.currentVersionId || '1.0').replace('v', ''));
        const rollbackVerId = `v${(currentNum + 0.1).toFixed(1)}`;

        const rollbackCommit: AutomationVersion = {
          versionId: rollbackVerId,
          proposalId: p.id,
          timestamp: 'Just now',
          author: 'Operator Rollback',
          commitMessage: `Rolled back to revision ${version.versionId}: "${version.commitMessage}"`,
          changeSummary: [
            `Restored trigger: ${version.snapshot.trigger.condition}`,
            `Restored ${version.snapshot.mcpExecutionPlan.length} MCP execution steps`,
            `Restored input-to-state correlation mappings`,
          ],
          snapshot: version.snapshot,
        };

        const reverted: AutomationProposal = {
          ...p,
          title: version.snapshot.title,
          summary: version.snapshot.summary,
          targetApps: version.snapshot.targetApps,
          bottleneckDetected: version.snapshot.bottleneckDetected,
          expectedTimeSaved: version.snapshot.expectedTimeSaved,
          costSavingsEstimate: version.snapshot.costSavingsEstimate,
          confidenceScore: version.snapshot.confidenceScore,
          trigger: version.snapshot.trigger,
          correlationModel: version.snapshot.correlationModel,
          mcpExecutionPlan: version.snapshot.mcpExecutionPlan,
          currentVersionId: rollbackVerId,
          versions: [...(p.versions || []), rollbackCommit],
        };

        return reverted;
      })
    );

    // Sync active modals
    setSelectedProposal((prev) => {
      if (!prev || prev.id !== proposalId) return prev;
      const currentNum = parseFloat((prev.currentVersionId || '1.0').replace('v', ''));
      return {
        ...prev,
        title: version.snapshot.title,
        summary: version.snapshot.summary,
        trigger: version.snapshot.trigger,
        correlationModel: version.snapshot.correlationModel,
        mcpExecutionPlan: version.snapshot.mcpExecutionPlan,
        expectedTimeSaved: version.snapshot.expectedTimeSaved,
        costSavingsEstimate: version.snapshot.costSavingsEstimate,
        confidenceScore: version.snapshot.confidenceScore,
        currentVersionId: `v${(currentNum + 0.1).toFixed(1)}`,
      };
    });

    if (versionTargetProposal?.id === proposalId) {
      setVersionTargetProposal((prev) => {
        if (!prev) return null;
        const currentNum = parseFloat((prev.currentVersionId || '1.0').replace('v', ''));
        return {
          ...prev,
          title: version.snapshot.title,
          summary: version.snapshot.summary,
          trigger: version.snapshot.trigger,
          correlationModel: version.snapshot.correlationModel,
          mcpExecutionPlan: version.snapshot.mcpExecutionPlan,
          currentVersionId: `v${(currentNum + 0.1).toFixed(1)}`,
        };
      });
    }

    showNotification(`Reverted to configuration ${version.versionId}`);
  };

  // Manual Version Snapshot / Commit
  const handleCreateVersion = (proposalId: string, commitMessage: string, changeSummary: string[]) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;

        const currentNum = parseFloat((p.currentVersionId || '1.0').replace('v', ''));
        const newVerId = `v${(currentNum + 0.1).toFixed(1)}`;

        const newCommit: AutomationVersion = {
          versionId: newVerId,
          proposalId: p.id,
          timestamp: 'Just now',
          author: 'Operator Manual Commit',
          commitMessage,
          changeSummary,
          snapshot: {
            title: p.title,
            summary: p.summary,
            targetApps: p.targetApps,
            bottleneckDetected: p.bottleneckDetected,
            expectedTimeSaved: p.expectedTimeSaved,
            costSavingsEstimate: p.costSavingsEstimate,
            reliabilityRate: p.reliabilityRate,
            confidenceScore: p.confidenceScore,
            trigger: p.trigger,
            correlationModel: p.correlationModel,
            mcpExecutionPlan: p.mcpExecutionPlan,
          },
        };

        const updated: AutomationProposal = {
          ...p,
          currentVersionId: newVerId,
          versions: [...(p.versions || []), newCommit],
        };

        if (selectedProposal?.id === proposalId) {
          setSelectedProposal(updated);
        }
        if (versionTargetProposal?.id === proposalId) {
          setVersionTargetProposal(updated);
        }

        return updated;
      })
    );

    showNotification(`Created new revision commit`);
  };

  // Open Version Control modal for a proposal
  const handleOpenVersions = (proposal: AutomationProposal) => {
    setVersionTargetProposal(proposal);
    setIsVersionModalOpen(true);
  };

  // One-Click Execution of MCP Plan
  const handleExecuteProposal = async (proposal: AutomationProposal) => {
    const requiredCredits = Math.max(1, proposal.mcpExecutionPlan?.length || 3);
    if (billingAccount.creditBalance < requiredCredits) {
      showNotification(`Insufficient credits (Requires ${requiredCredits} ⚡, Balance ${billingAccount.creditBalance} ⚡). Please subscribe or refill.`);
      setIsBillingModalOpen(true);
      return;
    }

    setIsExecutingId(proposal.id);

    try {
      const res = await fetch('/api/execute-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: proposal.id,
          steps: proposal.mcpExecutionPlan,
          contextData: { sourceApp: proposal.trigger.sourceApp },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === 'INSUFFICIENT_CREDITS') {
          showNotification(data.message || 'Insufficient credits for execution. Upgrade or refill credits to continue.');
          setIsBillingModalOpen(true);
          return;
        }
        throw new Error(data.error || 'Execution failed');
      }

      if (data.success) {
        if (data.billing) {
          setBillingAccount(data.billing);
        } else {
          setBillingAccount((prev) => ({
            ...prev,
            creditBalance: Math.max(0, prev.creditBalance - requiredCredits),
            usageStats: {
              ...prev.usageStats,
              monthlyCreditsUsed: prev.usageStats.monthlyCreditsUsed + requiredCredits,
              totalExecutionsRun: prev.usageStats.totalExecutionsRun + 1,
            },
          }));
        }

        const runResult: ExecutionRun = {
          executionId: data.executionId,
          planId: proposal.id,
          planTitle: proposal.title,
          timestamp: new Date().toLocaleTimeString(),
          executedSteps: data.executedSteps,
          summary: data.summary,
        };

        // Mark proposal active
        setProposals((prev) =>
          prev.map((p) => (p.id === proposal.id ? { ...p, status: 'ACTIVE' } : p))
        );

        setExecutionRun(runResult);
        showNotification(`Executed ${proposal.title} via direct MCP JSON-RPC (-${requiredCredits} ⚡)`);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      showNotification(err.message || 'Execution request failed. Check server logs.');
    } finally {
      setIsExecutingId(null);
    }
  };

  // Toggle tool autonomous execution
  const handleToggleAutonomous = (toolId: string) => {
    setTools((prev) =>
      prev.map((t) => (t.id === toolId ? { ...t, autoExecuteAllowed: !t.autoExecuteAllowed } : t))
    );
  };

  // Add new proposal from AI synthesis
  const handleProposalGenerated = (proposal: AutomationProposal) => {
    setProposals((prev) => [proposal, ...prev]);
    setSelectedProposal(proposal);
    showNotification(`New Automation Plan Generated: "${proposal.title}"`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
        onOpenFilters={() => setIsFilterModalOpen(true)}
        onOpenBilling={() => setIsBillingModalOpen(true)}
        billingAccount={billingAccount}
        observedCount={observedEvents.length}
        proposalsCount={proposals.length}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Floating Status Notification Toast */}
      {recentNotification && (
        <div className="fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-xs text-cyan-300 font-mono shadow-xl flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{recentNotification}</span>
        </div>
      )}

      {/* Main Content Layout with Browser Extension Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Left / Main Workspace Area */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Key Value Proposition Hero Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase tracking-wide">
                    Passive Workflow Learning
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Model Context Protocol (MCP) Enabled
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Zero DOM Scraping
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                    50,000+ Pre-Trained Tools
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                Direct API Software &amp; State-Level Browser Automation
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Rather than relying on fragile UI-level screen scraping (clicking pixel coordinates or parsing brittle DOM classes), Substrate runs as a browser extension sidebar observing background REST/GraphQL API traffic and correlating inputs with underlying data state changes to synthesize reliable MCP automations.
              </p>

              {/* Quick Action Highlights */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
                <button
                  onClick={() => setIsComparisonOpen(true)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <span>Why DOM scraping fails in production</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <button
                  onClick={() => setActiveView('mcp')}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <span>Browse 50,000+ pre-trained MCP connectors</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <button
                  onClick={() => setIsAiAnalysisOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <span>Analyze current session with Gemini</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Passive Learning Filters ({(filterConfig?.domainRules || []).filter((r) => r.enabled).length + (filterConfig?.actionTypes || []).filter((r) => r.enabled).length} active)</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: WORKSPACE SIMULATOR */}
          {activeView === 'workspace' && (
            <div className="space-y-6">
              <WebWorkspaceSimulator
                onEmitEvent={handleEmitEvent}
                onSynthesizeProposalFromAction={(title, domain, sampleEvts) => {
                  setIsAiAnalysisOpen(true);
                }}
              />

              {/* Mini Stream Preview at bottom of workspace */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Live Behind-the-Scenes Network Frame Interceptor
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveView('stream')}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Expand Full Inspector ({observedEvents.length})</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {observedEvents.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 font-bold text-[10px]">
                          {evt.method}
                        </span>
                        <span className="text-slate-300 truncate max-w-xs">{evt.endpoint}</span>
                        <span className="text-slate-500 font-sans text-[11px] hidden sm:inline">
                          ({evt.app})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400">{evt.latencyMs}ms</span>
                        <span>{evt.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: FULL API STATE STREAM */}
          {activeView === 'stream' && (
            <NetworkInspector events={observedEvents} />
          )}

          {/* VIEW 3: FULL PROPOSALS GRID */}
          {activeView === 'proposals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-emerald-400" />
                    Generated Automation Plans &amp; Bottleneck Diagnostics
                  </h2>
                  <p className="text-xs text-slate-400">
                    Synthesized autonomously by correlating user form submissions with underlying REST/GraphQL frames
                  </p>
                </div>
                <button
                  onClick={() => setIsAiAnalysisOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Synthesize New Plan
                </button>
              </div>

              {/* Full-Text Proposals Search Bar & Application Filter Chips */}
              <div 
                id="proposals-search-container"
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
              >
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="proposals-search-input"
                      type="text"
                      value={proposalSearchQuery}
                      onChange={(e) => setProposalSearchQuery(e.target.value)}
                      placeholder="Search proposals by title, summary, or targeted app (e.g. Stripe, Linear, HubSpot, Jira)..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
                    />
                    {proposalSearchQuery && (
                      <button
                        id="proposals-search-clear"
                        onClick={() => setProposalSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                        title="Clear search text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span 
                      id="proposals-results-counter"
                      className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
                    >
                      {filteredProposals.length === proposals.length && !proposalSearchQuery && proposalAppFilter === 'All' ? (
                        <span>{proposals.length} total automations</span>
                      ) : (
                        <span>
                          <strong className="text-cyan-400">{filteredProposals.length}</strong> of {proposals.length} matched
                        </span>
                      )}
                    </span>
                    {(proposalSearchQuery || proposalAppFilter !== 'All') && (
                      <button
                        id="proposals-reset-filters-btn"
                        onClick={() => {
                          setProposalSearchQuery('');
                          setProposalAppFilter('All');
                        }}
                        className="text-xs text-slate-400 hover:text-cyan-300 underline font-mono transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Target App Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono mr-1">Target App:</span>
                  <button
                    id="proposals-app-filter-all"
                    onClick={() => setProposalAppFilter('All')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      proposalAppFilter === 'All'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    All Apps ({proposals.length})
                  </button>
                  {allProposalTargetApps.map((app) => {
                    const count = proposals.filter((p) => p.targetApps?.includes(app)).length;
                    const isSelected = proposalAppFilter.toLowerCase() === app.toLowerCase();
                    return (
                      <button
                        key={app}
                        id={`proposals-app-filter-${app.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => setProposalAppFilter(isSelected ? 'All' : app)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {app} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredProposals.length === 0 ? (
                <div
                  id="proposals-empty-search-state"
                  className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      No matching automation proposals found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {proposalSearchQuery ? (
                        <>
                          No proposals matched your query &ldquo;<span className="text-cyan-300 font-semibold">{proposalSearchQuery}</span>&rdquo;
                          {proposalAppFilter !== 'All' ? ` with app filter &ldquo;${proposalAppFilter}&rdquo;` : ''}.
                        </>
                      ) : (
                        <>No proposals found for app &ldquo;{proposalAppFilter}&rdquo;.</>
                      )}
                      {' '}Try searching across titles, summaries, or target application names like Stripe, Linear, or Jira.
                    </p>
                  </div>
                  <button
                    id="proposals-clear-search-empty-btn"
                    onClick={() => {
                      setProposalSearchQuery('');
                      setProposalAppFilter('All');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Clear Search &amp; Reset Filters</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {prop.targetApps.map((a) => {
                            const isMatchedApp = proposalSearchQuery.trim() && a.toLowerCase().includes(proposalSearchQuery.toLowerCase().trim());
                            return (
                              <span 
                                key={a} 
                                className={`px-2 py-0.5 rounded border font-semibold text-[10px] transition-colors ${
                                  isMatchedApp
                                    ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/40'
                                    : 'bg-slate-950 border-slate-800 text-slate-300'
                                }`}
                              >
                                {a}
                              </span>
                            );
                          })}
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          prop.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                        }`}>
                          {prop.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                        {prop.title}
                      </h3>

                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                        {prop.summary}
                      </p>

                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-200/90 mb-3 space-y-1">
                        <div className="font-semibold text-amber-300 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          Bottleneck Diagnosed
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {prop.bottleneckDetected}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            Time Saved
                          </div>
                          <div className="font-bold text-slate-100 mt-0.5">
                            {prop.expectedTimeSaved}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-emerald-400" />
                            Direct ROI
                          </div>
                          <div className="font-bold text-emerald-400 mt-0.5">
                            {prop.costSavingsEstimate}
                          </div>
                        </div>
                      </div>

                      {/* Version & Feedback Indicators */}
                      <div className="flex items-center justify-between pb-3 text-xs text-slate-400 font-mono">
                        <button
                          onClick={() => handleOpenVersions(prop)}
                          className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60 transition-colors cursor-pointer"
                          title="View revision history and compare changes"
                        >
                          <GitBranch className="h-3 w-3 text-purple-400" />
                          <span>Revision {prop.currentVersionId || 'v1.0'}</span>
                          <span className="text-[10px] text-purple-400/80">({(prop.versions || []).length} revs)</span>
                        </button>

                        <button
                          onClick={() => setSelectedProposal(prop)}
                          className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 transition-colors cursor-pointer"
                          title="Rate accuracy or provide AI feedback"
                        >
                          <MessageSquare className="h-3 w-3 text-amber-400" />
                          <span>{(prop.feedbacks || []).length} AI reviews</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                      <button
                        onClick={() => setSelectedProposal(prop)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                      >
                        Inspect Full Rules &amp; MCP Graph
                      </button>

                      {(() => {
                        const stepCost = Math.max(1, prop.mcpExecutionPlan?.length || 3);
                        const hasCredits = billingAccount.creditBalance >= stepCost;

                        if (!hasCredits) {
                          return (
                            <button
                              onClick={() => setIsBillingModalOpen(true)}
                              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title={`Requires ${stepCost} credits, current balance is ${billingAccount.creditBalance}. Click to subscribe or refill.`}
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-400" />
                              <span>Refill (Need {stepCost} ⚡)</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleExecuteProposal(prop)}
                            disabled={isExecutingId === prop.id}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>One-Click Execute</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-cyan-950 text-[10px] font-mono border border-cyan-400/40 text-cyan-200">
                              ⚡{stepCost}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* VIEW 4: MCP REGISTRY FULL VIEW */}
          {activeView === 'mcp' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <GitMerge className="h-5 w-5 text-purple-400" />
                    Pre-Trained Model Context Protocol (MCP) Connectors
                  </h2>
                  <p className="text-xs text-slate-400">
                    Over 50,000 web tools indexed with zero DOM dependencies • Native JSON-RPC schema contracts
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 font-mono text-xs font-bold border border-purple-800/60">
                  50,420 Connectors Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {connectors.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-mono text-[11px]">{c.category}</span>
                        <span className="text-emerald-400 font-bold text-[10px]">v{c.version}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{c.name}</h4>
                      <p className="text-xs text-slate-400 mb-3">{c.toolsCount} pre-trained tool contracts</p>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.popularTools.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-purple-300 border border-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
                      Endpoint: mcp://{c.id}/v1
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 5: INTEGRATIONS & SYNC */}
          {activeView === 'integrations' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-amber-400" />
                  Connected Project Management &amp; SaaS Systems
                </h2>
                <p className="text-xs text-slate-400">
                  Substrate automatically listens to background webhooks and dispatches direct API calls autonomously
                </p>
              </div>

              <div className="space-y-3">
                {tools.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{t.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        {t.authMethod} • <span className="text-emerald-400">{t.status}</span> • Last Ping: {t.lastWebhookPing}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          {t.syncedEventsCount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Frames</div>
                      </div>

                      <button
                        onClick={() => handleToggleAutonomous(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          t.autoExecuteAllowed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.autoExecuteAllowed ? 'Autonomous ON' : 'Manual Approval'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Right Browser Extension Companion Sidebar */}
        {sidebarOpen && (
          <BrowserSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            proposals={proposals}
            onSelectProposal={(p) => setSelectedProposal(p)}
            onExecuteProposal={handleExecuteProposal}
            isExecutingId={isExecutingId}
            onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
            onOpenFilters={() => setIsFilterModalOpen(true)}
            onOpenVersions={handleOpenVersions}
            userCreditBalance={billingAccount.creditBalance}
            onOpenBilling={() => setIsBillingModalOpen(true)}
          />
        )}
      </div>

      {/* MODALS */}
      <ProposalDetailModal
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onExecute={handleExecuteProposal}
        isExecuting={Boolean(isExecutingId && selectedProposal?.id === isExecutingId)}
        onOpenVersions={handleOpenVersions}
        onSubmitFeedback={handleSubmitFeedback}
        userCreditBalance={billingAccount.creditBalance}
        onOpenBilling={() => setIsBillingModalOpen(true)}
      />

      <ExecutionTerminalModal
        run={executionRun}
        onClose={() => setExecutionRun(null)}
      />

      <ArchitectureComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />

      <McpRegistryModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
        connectors={connectors}
      />

      <IntegrationsSyncModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        tools={tools}
        onToggleAutonomous={handleToggleAutonomous}
      />

      <AiAnalysisModal
        isOpen={isAiAnalysisOpen}
        onClose={() => setIsAiAnalysisOpen(false)}
        observedEvents={observedEvents}
        onProposalGenerated={handleProposalGenerated}
        userCreditBalance={billingAccount.creditBalance}
        onOpenBilling={() => setIsBillingModalOpen(true)}
        onCreditDeducted={(newBal) => setBillingAccount((prev) => ({ ...prev, creditBalance: newBal }))}
      />

      <FilterConfigModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        config={filterConfig}
        onSaveConfig={(updated) => {
          setFilterConfig(updated);
          showNotification('Passive learning filter rules updated successfully');
        }}
      />

      <VersionControlModal
        isOpen={isVersionModalOpen}
        onClose={() => {
          setIsVersionModalOpen(false);
          setVersionTargetProposal(null);
        }}
        proposal={versionTargetProposal}
        onRevertVersion={(version) => {
          if (versionTargetProposal) {
            handleRevertVersion(versionTargetProposal.id, version);
          }
        }}
        onCreateVersion={(commitMsg, summary) => {
          if (versionTargetProposal) {
            handleCreateVersion(versionTargetProposal.id, commitMsg, summary);
          }
        }}
      />

      {/* Billing & Tier Subscriptions Hub Modal */}
      <BillingSubscriptionModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        account={billingAccount}
        onAccountUpdated={(updated) => {
          setBillingAccount(updated);
          showNotification('Billing configuration & credits updated');
        }}
      />
    </div>
  );
}
