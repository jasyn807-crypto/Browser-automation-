import React, { useState } from 'react';
import { 
  X, 
  Filter, 
  ShieldCheck, 
  Globe, 
  Activity, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles,
  Search,
  Check,
  Zap,
  Sliders,
  Play
} from 'lucide-react';
import { DomainFilterRule, ActionTypeFilterRule, PayloadRedactionRule, PassiveFilterConfig, ObservedApiEvent } from '../types';
import { evaluateFilter } from '../utils/filterEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: PassiveFilterConfig;
  onUpdateConfig?: (newConfig: PassiveFilterConfig) => void;
  onSaveConfig?: (newConfig: PassiveFilterConfig) => void;
  sampleEvent?: ObservedApiEvent;
}

export const FilterConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onSaveConfig,
  sampleEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'domains' | 'actions' | 'redaction' | 'endpoints' | 'test'>('domains');
  
  // Safe update callback wrapper
  const handleUpdate = (newConfig: PassiveFilterConfig) => {
    if (onUpdateConfig) onUpdateConfig(newConfig);
    if (onSaveConfig) onSaveConfig(newConfig);
  };
  
  // Safe array accessors
  const safeDomainRules = config?.domainRules || [];
  const safeActionTypes = config?.actionTypes || [];
  const safeRedactionRules = config?.payloadRedactionRules || [];
  const safeExclusions = config?.endpointExclusions || [];
  const safeInclusions = config?.endpointInclusions || [];
  
  // New domain form
  const [newDomainPattern, setNewDomainPattern] = useState('');
  const [newDomainType, setNewDomainType] = useState<'include' | 'exclude'>('exclude');
  const [newDomainDesc, setNewDomainDesc] = useState('');

  // New redaction form
  const [newRedactPattern, setNewRedactPattern] = useState('');

  // Test filter interactive state
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  // Master toggle
  const toggleMaster = () => {
    handleUpdate({
      ...config,
      enabled: !config.enabled,
    });
  };

  // Toggle domain rule
  const handleToggleDomainRule = (id: string) => {
    const updated = safeDomainRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    handleUpdate({ ...config, domainRules: updated });
  };

  // Add domain rule
  const handleAddDomainRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainPattern.trim()) return;

    const newRule: DomainFilterRule = {
      id: `dom-${Date.now()}`,
      pattern: newDomainPattern.trim(),
      type: newDomainType,
      enabled: true,
      description: newDomainDesc.trim() || `${newDomainType === 'include' ? 'Allow' : 'Block'} ${newDomainPattern}`,
    };

    handleUpdate({
      ...config,
      domainRules: [newRule, ...safeDomainRules],
    });

    setNewDomainPattern('');
    setNewDomainDesc('');
  };

  // Delete domain rule
  const handleDeleteDomainRule = (id: string) => {
    handleUpdate({
      ...config,
      domainRules: safeDomainRules.filter((r) => r.id !== id),
    });
  };

  // Toggle Action Type rule
  const handleToggleActionRule = (id: string) => {
    const updated = safeActionTypes.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    handleUpdate({ ...config, actionTypes: updated });
  };

  // Change action rule type (include vs exclude)
  const handleChangeActionRuleType = (id: string, ruleType: 'include' | 'exclude') => {
    const updated = safeActionTypes.map((a) =>
      a.id === id ? { ...a, rule: ruleType } : a
    );
    handleUpdate({ ...config, actionTypes: updated });
  };

  // Toggle Redaction Rule
  const handleToggleRedactionRule = (id: string) => {
    const updated = safeRedactionRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    handleUpdate({ ...config, payloadRedactionRules: updated });
  };

  // Add Redaction Rule
  const handleAddRedactionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRedactPattern.trim()) return;

    const newRule: PayloadRedactionRule = {
      id: `red-${Date.now()}`,
      fieldPattern: newRedactPattern.trim().toLowerCase(),
      action: 'redact',
      enabled: true,
    };

    handleUpdate({
      ...config,
      payloadRedactionRules: [newRule, ...safeRedactionRules],
    });

    setNewRedactPattern('');
  };

  // Delete Redaction Rule
  const handleDeleteRedactionRule = (id: string) => {
    handleUpdate({
      ...config,
      payloadRedactionRules: safeRedactionRules.filter((r) => r.id !== id),
    });
  };

  // Run test
  const runFilterTest = () => {
    if (!sampleEvent) return;
    const res = evaluateFilter(sampleEvent, config);
    setTestResult(res);
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    handleUpdate({
      ...config,
      domainRules: [
        { id: 'dom-1', pattern: '*.stripe.com', type: 'include', enabled: true, description: 'Billing, customer invoices & payment intents' },
        { id: 'dom-2', pattern: 'linear.app', type: 'include', enabled: true, description: 'Issue tracking, cycles & triage teams' },
        { id: 'dom-3', pattern: 'app.hubspot.com', type: 'include', enabled: true, description: 'CRM deals, companies & contact timelines' },
        { id: 'dom-4', pattern: '*.atlassian.net', type: 'include', enabled: true, description: 'Jira Software backlog & sprint tickets' },
        { id: 'dom-5', pattern: 'api.github.com', type: 'include', enabled: true, description: 'Code repositories, PRs & GitHub workflows' },
        { id: 'dom-6', pattern: 'slack.com', type: 'include', enabled: true, description: 'Internal notifications & collaborative Block Kit' },
        { id: 'dom-7', pattern: '*.internal-bank.corp', type: 'exclude', enabled: true, description: 'Internal banking accounts & treasury vault' },
        { id: 'dom-8', pattern: 'mail.google.com/personal/*', type: 'exclude', enabled: true, description: 'Non-corporate personal emails & private browsing' },
      ],
      actionTypes: [
        { id: 'act-1', actionType: 'form_submission', label: 'Form Submissions', description: 'POST/PUT form submissions and user input entries', enabled: true, rule: 'include' },
        { id: 'act-2', actionType: 'data_entry_diff', label: 'Data Mutations & State Diffs', description: 'PATCH/PUT JSON field changes and resource updates', enabled: true, rule: 'include' },
        { id: 'act-3', actionType: 'financial_mutation', label: 'Financial Transactions', description: 'Invoices, subscriptions, charges & refunds', enabled: true, rule: 'include' },
        { id: 'act-4', actionType: 'read_query', label: 'Read Queries & Polling', description: 'GET polling, telemetry pings & asset fetching', enabled: false, rule: 'exclude' },
        { id: 'act-5', actionType: 'auth_tokens', label: 'Auth Token Exchanges', description: 'OAuth token handshakes and session bearer tokens', enabled: false, rule: 'exclude' },
        { id: 'act-6', actionType: 'file_upload', label: 'File Uploads & Multipart', description: 'Heavy binary payloads and attachment streams', enabled: false, rule: 'exclude' },
      ],
      payloadRedactionRules: [
        { id: 'red-1', fieldPattern: 'password', action: 'redact', enabled: true },
        { id: 'red-2', fieldPattern: 'secret_key', action: 'redact', enabled: true },
        { id: 'red-3', fieldPattern: 'auth_token', action: 'redact', enabled: true },
        { id: 'red-4', fieldPattern: 'cvv', action: 'redact', enabled: true },
        { id: 'red-5', fieldPattern: 'ssn', action: 'redact', enabled: true },
        { id: 'red-6', fieldPattern: 'bank_account_number', action: 'redact', enabled: true },
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with Master Switch & Stats */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Filter className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Passive Learning Filter Engine</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  config.enabled 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {config.enabled ? 'Filtering Active' : 'Passive Learning Bypassed'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure websites, action categories, and sensitive elements to include or exclude from the AI learning stream.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Defaults
            </button>
            <button
              onClick={toggleMaster}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                config.enabled
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/30'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${config.enabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {config.enabled ? 'Engine Enabled' : 'Engine Paused'}
            </button>
          </div>
        </div>

        {/* Real-time Capture Metrics Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Frames Evaluated</span>
            <div className="text-lg font-bold font-mono text-white">{config.captureStats.totalEvaluated}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-emerald-400 uppercase font-mono">Captured for Learning</span>
            <div className="text-lg font-bold font-mono text-emerald-400">{config.captureStats.captured}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-amber-400 uppercase font-mono">Filtered / Blocked</span>
            <div className="text-lg font-bold font-mono text-amber-400">{config.captureStats.dropped}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-cyan-400 uppercase font-mono">Redacted Sensitive Keys</span>
            <div className="text-lg font-bold font-mono text-cyan-300">{config.captureStats.redactedFields}</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'domains'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>Websites &amp; Domains</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 font-mono">
              {config.domainRules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'actions'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Types of Actions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 font-mono">
              {config.actionTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('redaction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'redaction'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5 text-rose-400" />
            <span>Sensitive Data Redaction</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 font-mono">
              {config.payloadRedactionRules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'endpoints'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            <span>Endpoint Rules</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('test');
              runFilterTest();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'test'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="h-3.5 w-3.5 text-amber-400" />
            <span>Live Inspector &amp; Test</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: WEBSITES & DOMAINS */}
          {activeTab === 'domains' && (
            <div className="space-y-4">
              {/* Add domain rule form */}
              <form onSubmit={handleAddDomainRule} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Domain or Pattern (supports * wildcards)</label>
                  <input
                    type="text"
                    value={newDomainPattern}
                    onChange={(e) => setNewDomainPattern(e.target.value)}
                    placeholder="e.g. *.salesforce.com or internal-portal.corp"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="w-32">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Rule Policy</label>
                  <select
                    value={newDomainType}
                    onChange={(e) => setNewDomainType(e.target.value as 'include' | 'exclude')}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="include">Include (Allow)</option>
                    <option value="exclude">Exclude (Block)</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[180px]">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={newDomainDesc}
                    onChange={(e) => setNewDomainDesc(e.target.value)}
                    placeholder="e.g. Sales CRM or Personal Banking"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="self-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Rule
                  </button>
                </div>
              </form>

              {/* Rules List */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 font-mono text-[11px]">
                      <th className="p-3 font-medium">Domain Pattern</th>
                      <th className="p-3 font-medium">Policy</th>
                      <th className="p-3 font-medium">Purpose / Description</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {config.domainRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono text-cyan-300 font-semibold">
                          {rule.pattern}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rule.type === 'include'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          }`}>
                            {rule.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          {rule.description}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleDomainRule(rule.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              rule.enabled
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteDomainRule(rule.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TYPES OF ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs text-blue-200">
                <span className="font-semibold text-blue-300">Intelligent Action Categorization:</span> Substrate observes underlying REST &amp; GraphQL payloads behind the web page. Configure which interaction classes should feed into the passive workflow synthesizer.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.actionTypes.map((action) => (
                  <div
                    key={action.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      action.enabled
                        ? action.rule === 'include'
                          ? 'bg-slate-950/80 border-emerald-500/40'
                          : 'bg-slate-950/80 border-amber-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-xs text-white block">{action.label}</span>
                        <span className="text-[11px] text-slate-400 block">{action.description}</span>
                      </div>
                      <button
                        onClick={() => handleToggleActionRule(action.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          action.enabled
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {action.enabled ? 'Active Rule' : 'Inactive'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <span className="text-[11px] text-slate-400">Policy when detected:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleChangeActionRuleType(action.id, 'include')}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            action.rule === 'include'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Include in Learning
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeActionRuleType(action.id, 'exclude')}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            action.rule === 'exclude'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Exclude / Drop
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SENSITIVE DATA REDACTION */}
          {activeTab === 'redaction' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200">
                <span className="font-semibold text-amber-300">Zero Leakage Guarantee:</span> Keys matching these patterns are scrubbed and replaced with <code>[REDACTED]</code> before telemetry enters the correlation graph or reaches the AI model.
              </div>

              {/* Add Pattern */}
              <form onSubmit={handleAddRedactionRule} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Add Key Pattern to Redact</label>
                  <input
                    type="text"
                    value={newRedactPattern}
                    onChange={(e) => setNewRedactPattern(e.target.value)}
                    placeholder="e.g. routing_number or auth_bearer"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="self-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Redaction Pattern
                  </button>
                </div>
              </form>

              {/* Redaction Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {config.payloadRedactionRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-rose-300 block">
                        "{rule.fieldPattern}"
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Action: Mask &amp; Redact
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRedactionRule(rule.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          rule.enabled
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {rule.enabled ? 'Masking' : 'Off'}
                      </button>
                      <button
                        onClick={() => handleDeleteRedactionRule(rule.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ENDPOINT RULES */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Always Include Endpoints
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Network requests matching these path patterns are always evaluated for workflow correlation.
                  </p>
                  <div className="space-y-1.5">
                    {config.endpointInclusions.map((ep, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300">
                        {ep}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Always Exclude Endpoints (Noise Filter)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    High-volume analytics, heartbeat pings, and telemetry traces are dropped immediately.
                  </p>
                  <div className="space-y-1.5">
                    {config.endpointExclusions.map((ep, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-rose-300">
                        {ep}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE TEST INSPECTOR */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    Live Filter Rule Diagnostic
                  </h4>
                  <button
                    onClick={runFilterTest}
                    className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
                  >
                    Re-test Current Sample
                  </button>
                </div>

                {sampleEvent ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300">
                      <div><strong className="text-cyan-300">App:</strong> {sampleEvent.app} ({sampleEvent.method} {sampleEvent.endpoint})</div>
                      <div><strong className="text-cyan-300">Action Type Classified:</strong> Form / Mutation</div>
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-xl border ${
                        testResult.allowed 
                          ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-200' 
                          : 'bg-rose-950/20 border-rose-700/50 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2 font-bold mb-1">
                          {testResult.allowed ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              <span>PASSED: Captured for Passive Workflow Learning</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-rose-400" />
                              <span>BLOCKED: Excluded by Active Filter Policy</span>
                            </>
                          )}
                        </div>
                        {testResult.reason && (
                          <div className="text-[11px] text-slate-300 mt-1">
                            Reason: {testResult.reason}
                          </div>
                        )}
                        <div className="text-[11px] text-cyan-300 mt-1">
                          Redacted fields: {testResult.redactedCount}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No active sample event currently in buffer. Trigger an event in the Web Workspace Simulator to test.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Filters apply in-flight in browser extension • No sensitive storage
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Save &amp; Close Filter Settings
          </button>
        </div>
      </div>
    </div>
  );
};
