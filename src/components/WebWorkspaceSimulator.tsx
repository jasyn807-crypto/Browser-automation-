import React, { useState } from 'react';
import { 
  CreditCard, 
  SquareKanban, 
  Building2, 
  Kanban, 
  FileText, 
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { ObservedApiEvent } from '../types';

interface Props {
  onEmitEvent: (event: ObservedApiEvent) => void;
  onSynthesizeProposalFromAction: (actionTitle: string, appDomain: string, sampleEvents: ObservedApiEvent[]) => void;
}

export const WebWorkspaceSimulator: React.FC<Props> = ({ 
  onEmitEvent,
  onSynthesizeProposalFromAction 
}) => {
  const [activeApp, setActiveApp] = useState<'Stripe' | 'Linear' | 'HubSpot' | 'Jira' | 'Notion' | 'Slack'>('Stripe');
  const [customActionText, setCustomActionText] = useState('');
  const [customAmount, setCustomAmount] = useState('18500');
  const [customerEmail, setCustomerEmail] = useState('billing@acmecorp.io');
  const [isEmitting, setIsEmitting] = useState(false);
  const [lastEmittedAction, setLastEmittedAction] = useState<string | null>(null);

  // Stripe state
  const [stripeInvoices, setStripeInvoices] = useState([
    { id: 'in_9921', customer: 'Acme Systems', email: 'alex@acme.io', amount: 18500, status: 'open', attempt: 1 },
    { id: 'in_9922', customer: 'Cyberdyne Defense', email: 'sarah.connor@cyberdyne.com', amount: 14500, status: 'past_due', attempt: 2 },
    { id: 'in_9923', customer: 'Stark Robotics', email: 'tony@starkindustries.com', amount: 48000, status: 'paid', attempt: 1 },
  ]);

  // Linear state
  const [linearIssues, setLinearIssues] = useState([
    { id: 'LIN-401', title: '🚨 Payment Failure: Cyberdyne Defense ($14,500)', priority: 'Urgent', status: 'In Triage', cycle: 'Cycle 42' },
    { id: 'LIN-398', title: 'API rate limiting threshold escalation', priority: 'High', status: 'In Progress', cycle: 'Cycle 42' },
    { id: 'LIN-382', title: 'Customer onboarding webhook listener timeout', priority: 'Medium', status: 'Done', cycle: 'Cycle 41' },
  ]);

  // HubSpot state
  const [hubspotDeals, setHubspotDeals] = useState([
    { id: 'deal_101', name: 'Cyberdyne Systems - Enterprise Renewal', amount: 174000, stage: 'Contract Risk', owner: 'Rachel Adams' },
    { id: 'deal_102', name: 'Acme Global - Cloud Migration Expansion', amount: 89000, stage: 'Proposal Presented', owner: 'Marcus Vance' },
    { id: 'deal_103', name: 'Nexus Logistics - Platform License', amount: 54000, stage: 'Closed-Won', owner: 'Rachel Adams' },
  ]);

  // Jira state
  const [jiraTickets, setJiraTickets] = useState([
    { key: 'PROV-104', summary: 'Provision dedicated tenant for Nexus Logistics', status: 'In Sprint', epic: 'Enterprise Onboarding' },
    { key: 'CS-892', summary: 'Invoice payment retry error diagnostic', status: 'Backlog', epic: 'Customer Reliability' },
  ]);

  // Trigger Stripe Payment Failure
  const triggerStripeFailure = (invoiceId: string) => {
    setIsEmitting(true);
    const target = stripeInvoices.find(i => i.id === invoiceId) || stripeInvoices[0];
    
    // update local state
    setStripeInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'past_due', attempt: inv.attempt + 1 } : inv));

    const newEvent: ObservedApiEvent = {
      id: `evt-${Date.now()}`,
      timestamp: 'Just now',
      app: 'Stripe',
      method: 'POST',
      endpoint: `/v1/invoices/${invoiceId}/payment_attempts`,
      statusCode: 402,
      payload: {
        invoice_id: invoiceId,
        customer_email: target.email,
        amount_due: target.amount * 100,
        currency: 'usd',
        attempt_count: target.attempt + 1,
      },
      response: {
        error: {
          code: 'card_declined',
          decline_code: 'do_not_honor',
          message: `Card processing failed for ${target.customer} ($${target.amount.toLocaleString()})`,
        },
        status: 'past_due',
      },
      stateDiff: [
        { field: 'invoice.status', oldValue: target.status, newValue: 'past_due' },
        { field: 'invoice.attempt_count', oldValue: target.attempt, newValue: target.attempt + 1 },
        { field: 'customer.delinquent', oldValue: false, newValue: true },
      ],
      latencyMs: 128,
      correlatedUserAction: `Observed Stripe invoice ${invoiceId} transitioned to past_due (${target.customer})`,
    };

    onEmitEvent(newEvent);
    setLastEmittedAction(`Simulated: Stripe Payment Failure for ${target.customer}`);
    setTimeout(() => setIsEmitting(false), 400);
  };

  // Trigger Linear Issue Creation
  const triggerCreateLinearIssue = () => {
    setIsEmitting(true);
    const newId = `LIN-${Math.floor(Math.random() * 800) + 400}`;
    const newIssue = {
      id: newId,
      title: `🚨 Urgent Payment Triage: ${customerEmail} ($${parseInt(customAmount || '10000').toLocaleString()})`,
      priority: 'Urgent',
      status: 'In Triage',
      cycle: 'Cycle 42',
    };

    setLinearIssues(prev => [newIssue, ...prev]);

    const newEvent: ObservedApiEvent = {
      id: `evt-${Date.now()}`,
      timestamp: 'Just now',
      app: 'Linear',
      method: 'GRAPHQL',
      endpoint: '/graphql (mutation IssueCreate)',
      statusCode: 200,
      payload: {
        query: 'mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id title priority } } }',
        variables: {
          input: {
            title: newIssue.title,
            priority: 1,
            teamKey: 'REV',
            customerRef: customerEmail,
          },
        },
      },
      response: {
        data: {
          issueCreate: {
            issue: { id: newId, title: newIssue.title, priority: 1 },
          },
        },
      },
      stateDiff: [
        { field: 'linear.issues.count', oldValue: linearIssues.length, newValue: linearIssues.length + 1 },
        { field: 'triage.unassigned_count', oldValue: 1, newValue: 2 },
      ],
      latencyMs: 92,
      correlatedUserAction: `User created Linear Issue ${newId} referencing customer email ${customerEmail}`,
    };

    onEmitEvent(newEvent);
    setLastEmittedAction(`Simulated: Linear Urgent Issue ${newId} Created`);
    setTimeout(() => setIsEmitting(false), 400);
  };

  // Trigger HubSpot Deal Stage Update
  const triggerUpdateHubSpot = (dealId: string, newStage: string) => {
    setIsEmitting(true);
    const deal = hubspotDeals.find(d => d.id === dealId) || hubspotDeals[0];
    const oldStage = deal.stage;

    setHubspotDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));

    const newEvent: ObservedApiEvent = {
      id: `evt-${Date.now()}`,
      timestamp: 'Just now',
      app: 'HubSpot',
      method: 'PATCH',
      endpoint: `/crm/v3/objects/deals/${dealId}`,
      statusCode: 200,
      payload: {
        properties: {
          dealstage: newStage.toLowerCase().replace(' ', '_'),
          synced_by: 'user_session_observer',
        },
      },
      response: {
        id: dealId,
        properties: {
          dealname: deal.name,
          dealstage: newStage,
          amount: deal.amount,
        },
      },
      stateDiff: [
        { field: 'deal.stage', oldValue: oldStage, newValue: newStage },
        { field: 'pipeline.weighted_pipeline', oldValue: deal.amount * 0.5, newValue: newStage === 'Closed-Won' ? deal.amount : deal.amount * 0.2 },
      ],
      latencyMs: 165,
      correlatedUserAction: `User adjusted HubSpot deal "${deal.name}" stage from ${oldStage} -> ${newStage}`,
    };

    onEmitEvent(newEvent);
    setLastEmittedAction(`Simulated: HubSpot Deal ${deal.name} moved to ${newStage}`);
    setTimeout(() => setIsEmitting(false), 400);
  };

  // Trigger Custom Scenario
  const handleTriggerCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActionText.trim()) return;

    setIsEmitting(true);
    const newEvent: ObservedApiEvent = {
      id: `evt-${Date.now()}`,
      timestamp: 'Just now',
      app: activeApp,
      method: 'POST',
      endpoint: `/api/v2/${activeApp.toLowerCase()}/custom_action`,
      statusCode: 200,
      payload: {
        actionSummary: customActionText,
        userEmail: customerEmail,
        amount: Number(customAmount) || 12000,
        timestamp: new Date().toISOString(),
      },
      response: {
        acknowledged: true,
        actionId: `act_${Math.random().toString(36).substring(2, 7)}`,
        status: 'completed',
      },
      stateDiff: [
        { field: `${activeApp.toLowerCase()}.state`, oldValue: 'idle', newValue: 'user_modified' },
        { field: 'context.pending_handoff', oldValue: false, newValue: true },
      ],
      latencyMs: 110,
      correlatedUserAction: `User performed custom action in ${activeApp}: "${customActionText}"`,
    };

    onEmitEvent(newEvent);
    setLastEmittedAction(`Captured: ${customActionText}`);
    setCustomActionText('');
    setTimeout(() => setIsEmitting(false), 400);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Workspace Header */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <span className="text-xs font-semibold text-slate-300">
            Interactive SaaS Workspace Simulator
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/50 text-cyan-300 font-mono flex items-center gap-1">
            <Activity className="h-3 w-3 animate-pulse text-cyan-400" />
            Passive API Listener Hooked
          </span>
        </div>

        {/* Current Active App Indicator */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Active Context:</span>
          <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {activeApp}
          </span>
        </div>
      </div>

      {/* App Switcher Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/90 overflow-x-auto">
        <button
          onClick={() => setActiveApp('Stripe')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'Stripe'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <CreditCard className="h-4 w-4 text-cyan-400" />
          Stripe Billing
        </button>

        <button
          onClick={() => setActiveApp('Linear')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'Linear'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <SquareKanban className="h-4 w-4 text-indigo-400" />
          Linear Project Triage
        </button>

        <button
          onClick={() => setActiveApp('HubSpot')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'HubSpot'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <Building2 className="h-4 w-4 text-amber-400" />
          HubSpot CRM Deals
        </button>

        <button
          onClick={() => setActiveApp('Jira')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'Jira'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <Kanban className="h-4 w-4 text-blue-400" />
          Jira Cloud Sprint
        </button>

        <button
          onClick={() => setActiveApp('Notion')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'Notion'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <FileText className="h-4 w-4 text-emerald-400" />
          Notion Docs
        </button>

        <button
          onClick={() => setActiveApp('Slack')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeApp === 'Slack'
              ? 'border-cyan-500 text-cyan-300 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <MessageSquare className="h-4 w-4 text-rose-400" />
          Slack Channels
        </button>
      </div>

      {/* Workspace Body */}
      <div className="p-6">
        {/* Real-time Banner */}
        <div className="mb-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Passive Observation Mode:</strong> Click any action below. Substrate intercepts the API payload diff and correlates decisions without scraping any HTML elements.
            </span>
          </div>
          {lastEmittedAction && (
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 shrink-0">
              {lastEmittedAction}
            </span>
          )}
        </div>

        {/* TAB 1: STRIPE BILLING */}
        {activeApp === 'Stripe' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-cyan-400" />
                  Stripe Enterprise Invoices
                </h3>
                <p className="text-xs text-slate-400">Manage recurring invoices, subscription attempts, and payment webhooks</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live API: https://api.stripe.com/v1</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Invoice ID</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Attempts</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Simulate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stripeInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono text-slate-300">{inv.id}</td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-200">{inv.customer}</div>
                        <div className="text-[11px] text-slate-400">{inv.email}</div>
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-100">
                        ${inv.amount.toLocaleString()}.00
                      </td>
                      <td className="py-3 font-mono text-slate-300">{inv.attempt}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : inv.status === 'past_due'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => triggerStripeFailure(inv.id)}
                          disabled={isEmitting}
                          className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800/60 text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <AlertTriangle className="h-3 w-3 text-rose-400" />
                          Simulate Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LINEAR ISSUES */}
        {activeApp === 'Linear' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <SquareKanban className="h-4 w-4 text-indigo-400" />
                  Linear Issue Tracker &amp; Triage
                </h3>
                <p className="text-xs text-slate-400">Team REV • GraphQL mutation interceptor active</p>
              </div>
              <button
                onClick={triggerCreateLinearIssue}
                disabled={isEmitting}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                File Urgent Triage Ticket
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {linearIssues.map((issue) => (
                <div key={issue.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-mono text-indigo-400 font-semibold">{issue.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      issue.priority === 'Urgent' ? 'bg-rose-950 text-rose-300 border border-rose-800/60' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {issue.priority}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 line-clamp-2 mb-3">
                    {issue.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-900 pt-2">
                    <span>{issue.cycle}</span>
                    <span className="text-cyan-400 font-medium">{issue.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HUBSPOT CRM */}
        {activeApp === 'HubSpot' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  HubSpot Enterprise CRM Deals
                </h3>
                <p className="text-xs text-slate-400">Watching REST PATCH /crm/v3/objects/deals state mutations</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Synced CRM UUIDs: 4,120</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {hubspotDeals.map((deal) => (
                <div key={deal.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400 font-mono">{deal.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        deal.stage === 'Closed-Won'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : deal.stage === 'Contract Risk'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}>
                        {deal.stage}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-100 mb-1">{deal.name}</h4>
                    <div className="text-base font-bold font-mono text-emerald-400 mb-2">
                      ${deal.amount.toLocaleString()}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                    <button
                      onClick={() => triggerUpdateHubSpot(deal.id, 'Contract Risk')}
                      disabled={isEmitting}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition-colors"
                    >
                      Flag Risk
                    </button>
                    <button
                      onClick={() => triggerUpdateHubSpot(deal.id, 'Closed-Won')}
                      disabled={isEmitting}
                      className="flex-1 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-[11px] text-emerald-300 border border-emerald-800/50 font-medium transition-colors"
                    >
                      Won ($$$)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: JIRA SPRINT */}
        {activeApp === 'Jira' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-blue-400" />
                  Jira Cloud Sprint Backlog
                </h3>
                <p className="text-xs text-slate-400">Atlassian REST API v3 connected via Substrate MCP</p>
              </div>
            </div>

            <div className="space-y-2">
              {jiraTickets.map((t) => (
                <div key={t.key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-xs font-bold border border-blue-900/60">
                      {t.key}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-slate-200">{t.summary}</div>
                      <div className="text-[11px] text-slate-400">Epic: {t.epic}</div>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-400 font-medium px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: NOTION & SLACK */}
        {(activeApp === 'Notion' || activeApp === 'Slack') && (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {activeApp === 'Notion' ? <FileText className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </div>
            <h4 className="text-sm font-semibold text-white">
              {activeApp} Workspace Hook Active
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Substrate passively listens to {activeApp} background API calls (document row updates, block kit notifications, thread state events) without screen scraping.
            </p>
          </div>
        )}

        {/* Interactive Custom Event Trigger */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <form onSubmit={handleTriggerCustom} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Simulate Custom User Action &amp; API Intercept
              </span>
              <span className="text-[11px] text-slate-400">Correlates inputs with state diffs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={customActionText}
                onChange={(e) => setCustomActionText(e.target.value)}
                placeholder="e.g. Approved enterprise refund & notified billing team"
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@domain.com"
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400 font-mono">
                Payload format: Direct JSON REST/GraphQL frame
              </div>
              <button
                type="submit"
                disabled={!customActionText.trim() || isEmitting}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Emit &amp; Intercept
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
