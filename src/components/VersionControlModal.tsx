import React, { useState } from 'react';
import { 
  X, 
  GitBranch, 
  History, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  ArrowRight, 
  GitCommit, 
  Plus, 
  Sliders, 
  Sparkles,
  Zap,
  Code2,
  ChevronRight,
  SplitSquareVertical,
  Check,
  AlertCircle
} from 'lucide-react';
import { AutomationProposal, AutomationVersion } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: AutomationProposal | null;
  onRevertVersion: (proposalId: string, version: AutomationVersion) => void;
  onCreateVersion: (proposalId: string, commitMessage: string, changeSummary: string[]) => void;
}

export const VersionControlModal: React.FC<Props> = ({
  isOpen,
  onClose,
  proposal,
  onRevertVersion,
  onCreateVersion,
}) => {
  if (!isOpen || !proposal) return null;

  const versions = proposal.versions || [];
  const currentVersionId = proposal.currentVersionId || (versions.length > 0 ? versions[versions.length - 1].versionId : 'v1.0');

  const [selectedVersionId, setSelectedVersionId] = useState<string>(currentVersionId);
  const [compareVersionId, setCompareVersionId] = useState<string>(
    versions.length > 1 ? versions[versions.length - 2].versionId : currentVersionId
  );
  const [activeTab, setActiveTab] = useState<'history' | 'compare' | 'commit'>('history');

  // New version state
  const [newCommitMessage, setNewCommitMessage] = useState('');
  const [newChangeBullets, setNewChangeBullets] = useState('');

  const selectedVersion = versions.find((v) => v.versionId === selectedVersionId) || versions[versions.length - 1];
  const compareVersion = versions.find((v) => v.versionId === compareVersionId) || versions[0];

  const handleCreateNewCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitMessage.trim()) return;

    const bullets = newChangeBullets
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    onCreateVersion(proposal.id, newCommitMessage.trim(), bullets.length > 0 ? bullets : ['Manual parameter calibration']);
    setNewCommitMessage('');
    setNewChangeBullets('');
    setActiveTab('history');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Model Version Control &amp; History</h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                  {currentVersionId} ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect revision lineages, perform instant rollbacks, and compare side-by-side MCP automation configurations.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 my-4 shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5 text-cyan-400" />
            <span>Version Timeline</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 font-mono">
              {versions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'compare'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="h-3.5 w-3.5 text-indigo-400" />
            <span>Side-by-Side Comparator</span>
          </button>

          <button
            onClick={() => setActiveTab('commit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'commit'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Create Snapshot / Commit</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Version List Sidebar */}
              <div className="md:col-span-1 space-y-2 border-r border-slate-800/80 pr-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  Revision Commits ({versions.length})
                </h4>

                <div className="space-y-2">
                  {versions.slice().reverse().map((ver) => {
                    const isActive = ver.versionId === currentVersionId;
                    const isSelected = ver.versionId === selectedVersionId;

                    return (
                      <div
                        key={ver.versionId}
                        onClick={() => setSelectedVersionId(ver.versionId)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/60 shadow-md'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold text-purple-300">
                            {ver.versionId}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-white leading-snug line-clamp-2">
                          {ver.commitMessage}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{ver.author}</span>
                          <span>{ver.timestamp}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Version Detail */}
              {selectedVersion && (
                <div className="md:col-span-2 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white font-mono">{selectedVersion.versionId}</span>
                          <span className="text-xs text-slate-400">Committed by <strong>{selectedVersion.author}</strong></span>
                        </div>
                        <h3 className="text-sm font-semibold text-purple-300 mt-1">
                          {selectedVersion.commitMessage}
                        </h3>
                      </div>

                      {selectedVersion.versionId !== currentVersionId ? (
                        <button
                          onClick={() => onRevertVersion(proposal.id, selectedVersion)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Revert to {selectedVersion.versionId}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Currently Active Configuration
                        </div>
                      )}
                    </div>

                    {/* Change Summary Bullets */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Changes in this Revision:</span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {selectedVersion.changeSummary.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 text-cyan-400 shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Snapshot Metadata Bento */}
                    <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Confidence Score</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          {selectedVersion.snapshot.confidenceScore}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Time Saved</span>
                        <span className="font-bold text-white font-mono text-sm">
                          {selectedVersion.snapshot.expectedTimeSaved}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">MCP Tool Steps</span>
                        <span className="font-bold text-cyan-300 font-mono text-sm">
                          {selectedVersion.snapshot.mcpExecutionPlan.length} tools
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trigger Definition Snapshot */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-cyan-400" />
                      Snapshot Trigger Condition
                    </span>
                    <div className="font-mono text-xs text-cyan-300">
                      {selectedVersion.snapshot.trigger.endpoint}
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
                      Condition: {selectedVersion.snapshot.trigger.condition}
                    </div>
                  </div>

                  {/* MCP Tool Steps Snapshot */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                      MCP Execution Steps ({selectedVersion.snapshot.mcpExecutionPlan.length})
                    </span>
                    {selectedVersion.snapshot.mcpExecutionPlan.map((step) => (
                      <div key={step.step} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">
                            {step.step}
                          </span>
                          <span className="text-white font-medium">{step.description}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">
                          {step.connectorId}.{step.tool}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SIDE-BY-SIDE COMPARATOR */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              {/* Selectors */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Base Revision (Version A)
                  </label>
                  <select
                    value={compareVersionId}
                    onChange={(e) => setCompareVersionId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {versions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.versionId} — {v.commitMessage.substring(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Target Revision (Version B)
                  </label>
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {versions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.versionId} — {v.commitMessage.substring(0, 45)}... {v.versionId === currentVersionId ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-side Visual Diff Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version A Column */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono text-sm font-bold text-amber-300">
                      Revision: {compareVersion?.versionId}
                    </span>
                    <span className="text-[11px] text-slate-400">{compareVersion?.timestamp}</span>
                  </div>

                  {/* Trigger condition */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Trigger Condition:</span>
                    <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-slate-300 border border-slate-800">
                      {compareVersion?.snapshot.trigger.condition}
                    </div>
                  </div>

                  {/* MCP Steps */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      MCP Steps ({compareVersion?.snapshot.mcpExecutionPlan.length || 0})
                    </span>
                    {compareVersion?.snapshot.mcpExecutionPlan.map((step) => (
                      <div key={step.step} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-white">Step {step.step}: {step.tool}</span>
                          <span className="text-cyan-300">{step.connectorId}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{step.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Metrics */}
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono">
                    <div>Confidence: <strong className="text-emerald-400">{compareVersion?.snapshot.confidenceScore}%</strong></div>
                    <div>Expected Savings: <strong className="text-white">{compareVersion?.snapshot.expectedTimeSaved}</strong></div>
                  </div>
                </div>

                {/* Version B Column */}
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/60 space-y-4 shadow-lg shadow-purple-950/20">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono text-sm font-bold text-cyan-300">
                      Revision: {selectedVersion?.versionId} {selectedVersion?.versionId === currentVersionId ? '(Active)' : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">{selectedVersion?.timestamp}</span>
                  </div>

                  {/* Trigger condition */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Trigger Condition:</span>
                    <div className={`p-2 rounded bg-slate-900 font-mono text-[11px] border ${
                      selectedVersion?.snapshot.trigger.condition !== compareVersion?.snapshot.trigger.condition
                        ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200'
                        : 'border-slate-800 text-slate-300'
                    }`}>
                      {selectedVersion?.snapshot.trigger.condition}
                    </div>
                  </div>

                  {/* MCP Steps */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      MCP Steps ({selectedVersion?.snapshot.mcpExecutionPlan.length || 0})
                    </span>
                    {selectedVersion?.snapshot.mcpExecutionPlan.map((step) => {
                      const isNewStep = (compareVersion?.snapshot.mcpExecutionPlan.length || 0) < step.step;

                      return (
                        <div key={step.step} className={`p-2 rounded border text-xs space-y-1 ${
                          isNewStep 
                            ? 'bg-emerald-950/20 border-emerald-600/50' 
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-white">Step {step.step}: {step.tool}</span>
                            <span className="text-cyan-300">{step.connectorId}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">{step.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Metrics */}
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono">
                    <div>Confidence: <strong className="text-emerald-400">{selectedVersion?.snapshot.confidenceScore}%</strong></div>
                    <div>Expected Savings: <strong className="text-white">{selectedVersion?.snapshot.expectedTimeSaved}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE SNAPSHOT */}
          {activeTab === 'commit' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-2xl mx-auto space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-emerald-400" />
                  Commit Current Configuration as New Version
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Save a permanent snapshot of the current trigger rules, correlation models, and MCP tool steps with custom notes.
                </p>
              </div>

              <form onSubmit={handleCreateNewCommit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Commit Message / Title
                  </label>
                  <input
                    type="text"
                    value={newCommitMessage}
                    onChange={(e) => setNewCommitMessage(e.target.value)}
                    placeholder="e.g. Enforced secondary retry filter and validated Linear SLA labels"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Change Summary Bullets (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={newChangeBullets}
                    onChange={(e) => setNewChangeBullets(e.target.value)}
                    placeholder={"- Tuned attempt count check to >= 2\n- Added Slack block kit button action\n- Verified MCP token scopes"}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Commit Version Snapshot
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Immutable JSON state snapshots • Revert anytime with 1 click
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
