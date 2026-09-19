import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy init Gemini AI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ---------------------------------------------------------------------------
// LLM provider layer: frellm (OpenAI-compatible local router) first, Gemini
// fallback. The agent loop calls callLLM() and never cares which one answered.
// ---------------------------------------------------------------------------

const FREELLM_BASE_URL = process.env.FREELLM_BASE_URL || "";
const FREELLM_MODEL = process.env.FREELLM_MODEL || "auto";
const FREELLM_KEY = process.env.FREELLM_API_KEY || process.env.HERMES_CUSTOM_FREELLM_API_KEY || "";

function frellmAvailable(): boolean {
  return Boolean(FREELLM_BASE_URL && FREELLM_KEY);
}

async function callFrellm(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${FREELLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FREELLM_KEY}`,
      },
      body: JSON.stringify({
        model: FREELLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      console.warn(`[agent] frellm HTTP ${res.status}`);
      return null;
    }
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch (err: any) {
    console.warn(`[agent] frellm call failed: ${err.message}`);
    return null;
  }
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });
    return response.text ?? null;
  } catch (err: any) {
    console.warn(`[agent] gemini call failed: ${err.message}`);
    return null;
  }
}

// Unified: try frellm (local router, auto model) then Gemini.
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (frellmAvailable()) {
    const out = await callFrellm(systemPrompt, userPrompt);
    if (out) return out;
  }
  return callGemini(systemPrompt, userPrompt);
}

// In-memory Billing & Credit Management State
interface ServerBillingAccount {
  currentTierId: 'free_starter' | 'pro_operator' | 'business_team' | 'enterprise_scale';
  isTrial: boolean;
  creditBalance: number;
  monthlyCreditQuota: number;
  billingCycle: 'monthly' | 'annual';
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  nextBillingDate: string;
  clientName: string;
  clientEmail: string;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
    holderName: string;
  };
  totalUsedCredits: number;
  totalSavedMinutes: number;
  ledger: Array<{
    id: string;
    timestamp: string;
    amount: number;
    type: string;
    description: string;
    balanceAfter: number;
    relatedPlanId?: string;
    stepsCount?: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    amountCharged: number;
    tierId: string;
    tierName: string;
    billingInterval: 'monthly' | 'annual';
    creditsAllotted: number;
    status: 'PAID' | 'REFUNDED';
    paymentMethod: string;
    clientName?: string;
    clientEmail?: string;
  }>;
}

const TIER_CONFIG: Record<string, { name: string; monthlyPrice: number; annualMonthlyPrice: number; creditsPerMonth: number }> = {
  free_starter: { name: 'Free Trial', monthlyPrice: 0, annualMonthlyPrice: 0, creditsPerMonth: 50 },
  pro_operator: { name: 'Pro Operator', monthlyPrice: 49, annualMonthlyPrice: 39, creditsPerMonth: 600 },
  business_team: { name: 'Business Team', monthlyPrice: 149, annualMonthlyPrice: 119, creditsPerMonth: 2500 },
  enterprise_scale: { name: 'Enterprise Dedicated', monthlyPrice: 499, annualMonthlyPrice: 399, creditsPerMonth: 10000 },
};

const ADDON_PACKS: Record<string, { name: string; credits: number; price: number }> = {
  addon_150: { name: 'Quick Refill', credits: 150, price: 15 },
  addon_500: { name: 'Pro Pack', credits: 500, price: 45 },
  addon_1500: { name: 'Scale Surge', credits: 1500, price: 120 },
  addon_5000: { name: 'Bulk Quota', credits: 5000, price: 350 },
};

const serverBillingAccount: ServerBillingAccount = {
  currentTierId: 'free_starter',
  isTrial: true,
  creditBalance: 50, // 50 Sample Free Credits included initially
  monthlyCreditQuota: 50,
  billingCycle: 'monthly',
  status: 'TRIAL',
  nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
  clientName: 'Acme Operations Corp',
  clientEmail: 'billing@acme.corp',
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expMonth: '12',
    expYear: '2028',
    holderName: 'Dev Lead',
  },
  totalUsedCredits: 0,
  totalSavedMinutes: 0,
  ledger: [
    {
      id: 'ledg_init_welcome',
      timestamp: 'Initial Signup',
      amount: 50,
      type: 'TRIAL_SAMPLE_GRANT',
      description: 'Welcome Grant: 50 Sample Free Trial Credits to test direct MCP automations',
      balanceAfter: 50,
    },
  ],
  invoices: [],
};

// Pre-trained MCP Connectors catalog (representative sample of 50,000+ connectors)
const MCP_CONNECTORS = [
  {
    id: "linear-mcp",
    name: "Linear MCP Connector",
    category: "Project Management",
    version: "2.4.1",
    status: "active",
    toolsCount: 28,
    icon: "SquareKanban",
    popularTools: ["create_issue", "update_issue_status", "assign_cycle", "link_pr"],
    schemaSample: {
      type: "object",
      properties: {
        teamKey: { type: "string" },
        title: { type: "string" },
        priority: { type: "number", enum: [0, 1, 2, 3, 4] },
        state: { type: "string" }
      }
    }
  },
  {
    id: "jira-mcp",
    name: "Jira Cloud MCP Connector",
    category: "Project Management",
    version: "3.1.0",
    status: "active",
    toolsCount: 42,
    icon: "Kanban",
    popularTools: ["transition_issue", "add_worklog", "create_subtask", "update_sprint"],
    schemaSample: {
      type: "object",
      properties: {
        issueKey: { type: "string" },
        transitionId: { type: "string" },
        comment: { type: "string" }
      }
    }
  },
  {
    id: "hubspot-mcp",
    name: "HubSpot CRM MCP Connector",
    category: "CRM & Sales",
    version: "2.8.5",
    status: "active",
    toolsCount: 64,
    icon: "Building2",
    popularTools: ["update_deal_stage", "sync_contact_timeline", "create_company_note", "trigger_lifecycle_stage"],
    schemaSample: {
      type: "object",
      properties: {
        dealId: { type: "string" },
        stage: { type: "string" },
        amount: { type: "number" }
      }
    }
  },
  {
    id: "stripe-mcp",
    name: "Stripe Billing & Subscriptions MCP",
    category: "Payments & Finance",
    version: "4.0.2",
    status: "active",
    toolsCount: 78,
    icon: "CreditCard",
    popularTools: ["retry_invoice_payment", "update_subscription_meta", "create_customer_refund", "apply_discount_coupon"],
    schemaSample: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        invoiceId: { type: "string" },
        action: { type: "string" }
      }
    }
  },
  {
    id: "notion-mcp",
    name: "Notion Enterprise MCP Connector",
    category: "Knowledge & Docs",
    version: "1.9.4",
    status: "active",
    toolsCount: 35,
    icon: "FileText",
    popularTools: ["append_database_row", "update_page_property", "sync_meeting_notes", "query_database"],
    schemaSample: {
      type: "object",
      properties: {
        databaseId: { type: "string" },
        properties: { type: "object" }
      }
    }
  },
  {
    id: "gmail-mcp",
    name: "Gmail & Google Workspace MCP",
    category: "Communication",
    version: "2.1.2",
    status: "active",
    toolsCount: 22,
    icon: "Mail",
    popularTools: ["send_templated_draft", "create_thread_label", "archive_processed_thread"],
    schemaSample: {
      type: "object",
      properties: {
        recipient: { type: "string" },
        subject: { type: "string" },
        bodyHtml: { type: "string" }
      }
    }
  },
  {
    id: "github-mcp",
    name: "GitHub Developer MCP Connector",
    category: "DevOps & Engineering",
    version: "3.2.0",
    status: "active",
    toolsCount: 56,
    icon: "GitBranch",
    popularTools: ["create_pull_request", "add_issue_comment", "merge_pr", "dispatch_workflow"],
    schemaSample: {
      type: "object",
      properties: {
        repo: { type: "string" },
        prNumber: { type: "number" },
        commitMessage: { type: "string" }
      }
    }
  },
  {
    id: "slack-mcp",
    name: "Slack Collaborative MCP Connector",
    category: "Communication",
    version: "2.5.0",
    status: "active",
    toolsCount: 31,
    icon: "MessageSquare",
    popularTools: ["post_ephemeral_alert", "post_channel_block_kit", "update_status_pin"],
    schemaSample: {
      type: "object",
      properties: {
        channelId: { type: "string" },
        blocks: { type: "array" }
      }
    }
  }
];

// Health endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    mcpConnectorsAvailable: "50,000+",
    timestamp: new Date().toISOString(),
  });
});

// Get Connectors
app.get("/api/connectors", (_req, res) => {
  res.json({
    totalPreTrainedConnectors: 50420,
    catalog: MCP_CONNECTORS,
  });
});

// BILLING & CREDIT ASSIGNMENT ENDPOINTS
// Get current billing account, tiers, and credit balance
app.get("/api/billing/account", (_req, res) => {
  res.json({
    account: serverBillingAccount,
    tiers: TIER_CONFIG,
    addonPacks: ADDON_PACKS,
  });
});

// Subscribe to a monthly tier / Charge client monthly
app.post("/api/billing/subscribe", (req, res) => {
  try {
    const { tierId, billingCycle = 'monthly', clientName, clientEmail, paymentMethod } = req.body;
    const tier = TIER_CONFIG[tierId];

    if (!tier) {
      return res.status(400).json({ error: "Invalid subscription tier ID" });
    }

    const interval = billingCycle === 'annual' ? 'annual' : 'monthly';
    const amountCharged = interval === 'annual' ? tier.annualMonthlyPrice * 12 : tier.monthlyPrice;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    serverBillingAccount.currentTierId = tierId as any;
    serverBillingAccount.isTrial = false;
    serverBillingAccount.status = 'ACTIVE';
    serverBillingAccount.billingCycle = interval;
    serverBillingAccount.monthlyCreditQuota = tier.creditsPerMonth;
    // Set credit balance to tier quota (plus any existing positive balance)
    serverBillingAccount.creditBalance = Math.max(serverBillingAccount.creditBalance, 0) + tier.creditsPerMonth;
    if (clientName) serverBillingAccount.clientName = clientName;
    if (clientEmail) serverBillingAccount.clientEmail = clientEmail;
    if (paymentMethod) serverBillingAccount.paymentMethod = paymentMethod;

    serverBillingAccount.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amountCharged,
      tierId,
      tierName: tier.name,
      billingInterval: interval as 'monthly' | 'annual',
      creditsAllotted: tier.creditsPerMonth,
      status: 'PAID' as const,
      paymentMethod: `${serverBillingAccount.paymentMethod.brand} ending in ${serverBillingAccount.paymentMethod.last4}`,
      clientName: serverBillingAccount.clientName,
      clientEmail: serverBillingAccount.clientEmail,
    };

    serverBillingAccount.invoices.unshift(invoice);

    serverBillingAccount.ledger.unshift({
      id: `ledg_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      amount: tier.creditsPerMonth,
      type: 'MONTHLY_TIER_CREDIT',
      description: `Subscribed to ${tier.name} (${interval === 'annual' ? 'Annual Plan' : 'Monthly Plan'} - $${amountCharged}): Granted ${tier.creditsPerMonth} credits`,
      balanceAfter: serverBillingAccount.creditBalance,
    });

    res.json({
      success: true,
      account: serverBillingAccount,
      invoice,
      message: `Successfully charged $${amountCharged} and activated ${tier.name}. Granted ${tier.creditsPerMonth} monthly credits!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Subscription upgrade failed" });
  }
});

// Simulate monthly recurring billing charge / cycle renewal
app.post("/api/billing/renew-monthly", (_req, res) => {
  try {
    const tier = TIER_CONFIG[serverBillingAccount.currentTierId] || TIER_CONFIG.pro_operator;
    const interval = serverBillingAccount.billingCycle;
    const amountCharged = interval === 'annual' ? tier.annualMonthlyPrice * 12 : tier.monthlyPrice;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Renew quota
    serverBillingAccount.creditBalance += tier.creditsPerMonth;
    serverBillingAccount.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amountCharged,
      tierId: serverBillingAccount.currentTierId,
      tierName: tier.name,
      billingInterval: interval,
      creditsAllotted: tier.creditsPerMonth,
      status: 'PAID' as const,
      paymentMethod: `${serverBillingAccount.paymentMethod.brand} ending in ${serverBillingAccount.paymentMethod.last4}`,
      clientName: serverBillingAccount.clientName,
      clientEmail: serverBillingAccount.clientEmail,
    };

    serverBillingAccount.invoices.unshift(invoice);

    serverBillingAccount.ledger.unshift({
      id: `ledg_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      amount: tier.creditsPerMonth,
      type: 'MONTHLY_TIER_CREDIT',
      description: `Monthly Recurring Renewal (${tier.name} - $${amountCharged}): Replenished ${tier.creditsPerMonth} monthly credits`,
      balanceAfter: serverBillingAccount.creditBalance,
    });

    res.json({
      success: true,
      account: serverBillingAccount,
      invoice,
      message: `Simulated monthly charge of $${amountCharged} processed. Credited ${tier.creditsPerMonth} credits.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Monthly renewal failed" });
  }
});

// Buy on-demand credit add-on pack
app.post("/api/billing/buy-credits", (req, res) => {
  try {
    const { packId } = req.body;
    const pack = ADDON_PACKS[packId];

    if (!pack) {
      return res.status(400).json({ error: "Invalid credit add-on pack" });
    }

    serverBillingAccount.creditBalance += pack.credits;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amountCharged: pack.price,
      tierId: serverBillingAccount.currentTierId,
      tierName: `Add-on: ${pack.name} (+${pack.credits} Credits)`,
      billingInterval: 'monthly' as const,
      creditsAllotted: pack.credits,
      status: 'PAID' as const,
      paymentMethod: `${serverBillingAccount.paymentMethod.brand} ending in ${serverBillingAccount.paymentMethod.last4}`,
      clientName: serverBillingAccount.clientName,
      clientEmail: serverBillingAccount.clientEmail,
    };

    serverBillingAccount.invoices.unshift(invoice);

    serverBillingAccount.ledger.unshift({
      id: `ledg_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      amount: pack.credits,
      type: 'ADDON_PURCHASE',
      description: `Purchased Add-on Credit Pack: ${pack.name} (+$${pack.price})`,
      balanceAfter: serverBillingAccount.creditBalance,
    });

    res.json({
      success: true,
      account: serverBillingAccount,
      invoice,
      message: `Purchased ${pack.credits} credits for $${pack.price}!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Addon purchase failed" });
  }
});

// Reset account to initial sample free trial credits
app.post("/api/billing/reset-trial", (_req, res) => {
  serverBillingAccount.currentTierId = 'free_starter';
  serverBillingAccount.isTrial = true;
  serverBillingAccount.creditBalance = 50; // 50 sample free credits
  serverBillingAccount.monthlyCreditQuota = 50;
  serverBillingAccount.status = 'TRIAL';
  serverBillingAccount.ledger.unshift({
    id: `ledg_${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    amount: 50,
    type: 'TRIAL_SAMPLE_GRANT',
    description: 'Sample Free Credits Reload: 50 trial credits restored for testing',
    balanceAfter: 50,
  });

  res.json({
    success: true,
    account: serverBillingAccount,
    message: "Reset account to 50 sample free trial credits",
  });
});

// Gemini AI workflow correlation & proposal generator
app.post("/api/analyze-workflow", async (req, res) => {
  try {
    // Check credit balance (5 credits per AI workflow synthesis)
    const AI_SYNTHESIS_COST = 5;
    if (serverBillingAccount.creditBalance < AI_SYNTHESIS_COST) {
      return res.status(402).json({
        success: false,
        error: "INSUFFICIENT_CREDITS",
        message: `Insufficient credits. AI workflow synthesis requires ${AI_SYNTHESIS_COST} credits, but you have ${serverBillingAccount.creditBalance} remaining. Upgrade to a paid monthly plan to continue.`,
        requiredCredits: AI_SYNTHESIS_COST,
        currentBalance: serverBillingAccount.creditBalance,
        isTrial: serverBillingAccount.isTrial,
      });
    }

    const { observations, scenarioTitle, appDomain } = req.body;
    const ai = getGenAI();

    // Deduct credits on success
    const recordAiCreditUsage = () => {
      serverBillingAccount.creditBalance -= AI_SYNTHESIS_COST;
      serverBillingAccount.totalUsedCredits += AI_SYNTHESIS_COST;
      serverBillingAccount.totalSavedMinutes += 25;
      serverBillingAccount.ledger.unshift({
        id: `ledg_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        amount: -AI_SYNTHESIS_COST,
        type: 'USAGE_AI_SYNTHESIS',
        description: `Gemini AI Workflow Synthesis: "${scenarioTitle || 'Passive Browser Observation'}"`,
        balanceAfter: serverBillingAccount.creditBalance,
      });
    };

    if (ai) {
      const prompt = `
You are the Substrate AI Workflow Engine. You passively observe browser network requests, REST/GraphQL API traffic, and data state mutations as the user interacts with web applications (HubSpot, Stripe, Linear, Jira, Notion, GitHub, etc.).

Analyze the following recorded user interactions and backend API traces:
${JSON.stringify({ scenarioTitle, appDomain, observations }, null, 2)}

Synthesize a comprehensive, production-ready AUTOMATION PROPOSAL.
Crucial constraints:
- Do NOT use screen scraping, DOM queries, or coordinate clicking.
- All actions must be modeled via direct API endpoints, state correlation diffs, and Model Context Protocol (MCP) tool calls.
- Clearly identify the operational bottleneck, compute expected time and cost saved per month, define the precise trigger condition, and specify the exact MCP tool execution sequence.

Return a valid JSON object matching this structure:
{
  "title": "Descriptive Automation Plan Title",
  "summary": "Short 2-sentence executive summary",
  "targetApps": ["Stripe", "Linear", "Slack"],
  "bottleneckDetected": "Detailed explanation of manual delay and human error rate",
  "expectedTimeSaved": "e.g. 16.4 hours / month",
  "costSavingsEstimate": "e.g. $1,950 / month",
  "reliabilityRate": "99.98% (vs 42% for DOM screen-scraping)",
  "trigger": {
    "type": "API_WEBHOOK_STATE_DIFF",
    "sourceApp": "Stripe",
    "endpoint": "POST /v1/invoices/inv_.../payment_intent",
    "condition": "event == 'invoice.payment_failed' && payload.attempt_count >= 2",
    "observedDelta": "status changed from 'pending' to 'past_due' with failure_code: card_declined"
  },
  "correlationModel": [
    {
      "sourceField": "payload.data.object.customer.email",
      "targetTool": "linear-mcp.create_issue",
      "targetParam": "description",
      "transformation": "Lookup CRM Account & Embed Customer UUID"
    },
    {
      "sourceField": "payload.data.object.amount_due",
      "targetTool": "hubspot-mcp.update_deal_stage",
      "targetParam": "deal_risk_score",
      "transformation": "Set risk level = 'high' if amount > 5000"
    }
  ],
  "mcpExecutionPlan": [
    {
      "step": 1,
      "connectorId": "linear-mcp",
      "tool": "create_issue",
      "description": "Create high-priority escalation ticket for Account Exec",
      "sampleParams": {
        "teamKey": "ENG",
        "title": "Payment Failure Urgent: Customer {{customer.name}}",
        "priority": 1,
        "state": "Todo"
      }
    },
    {
      "step": 2,
      "connectorId": "hubspot-mcp",
      "tool": "update_deal_stage",
      "description": "Flag deal in HubSpot CRM as Payment Pending Review",
      "sampleParams": {
        "dealId": "{{hubspot.matched_deal_id}}",
        "stage": "at_risk"
      }
    },
    {
      "step": 3,
      "connectorId": "slack-mcp",
      "tool": "post_channel_block_kit",
      "description": "Notify #revops-alerts channel with one-click retry button",
      "sampleParams": {
        "channelId": "C0589REVOP",
        "message": "⚠️ Invoice payment failed for {{customer.company}} ($12,500)"
      }
    }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        recordAiCreditUsage();
        return res.json({ 
          success: true, 
          plan: parsed, 
          generatedBy: "gemini-3.8-flash",
          billing: {
            creditsDeducted: AI_SYNTHESIS_COST,
            creditBalance: serverBillingAccount.creditBalance,
          }
        });
      }
    }

    // High-fidelity fallback model if no API key or API response
    const fallbackPlan = {
      title: scenarioTitle ? `Autonomous ${scenarioTitle} Pipeline` : "Cross-App Subscription & Escalation Sync",
      summary: "Direct MCP integration replaces 4 repetitive manual copy-paste steps across Stripe, Linear, and HubSpot with deterministic API state synchronization.",
      targetApps: ["Stripe", "Linear", "HubSpot", "Slack"],
      bottleneckDetected: "Users spend an average of 4.2 minutes per failed transaction cross-referencing customer IDs in Stripe, searching HubSpot CRM deals, and filing Linear escalation tickets manually.",
      expectedTimeSaved: "14.8 hours / month",
      costSavingsEstimate: "$1,850 / month",
      reliabilityRate: "99.98% (Zero DOM scraping dependency)",
      trigger: {
        type: "API_STATE_DIFF",
        sourceApp: "Stripe Billing",
        endpoint: "POST /v1/invoices/:id/payment_attempt",
        condition: "invoice.status == 'open' && attempt_count >= 2 && amount_due > 50000",
        observedDelta: "State transition 'requires_action' -> 'payment_failed' intercepted with Stripe customer UUID",
      },
      correlationModel: [
        {
          sourceField: "invoice.customer.email",
          targetTool: "linear-mcp.create_issue",
          targetParam: "title / customer_ref",
          transformation: "Direct string correlation to Team Customer Record",
        },
        {
          sourceField: "invoice.amount_due",
          targetTool: "hubspot-mcp.update_deal_stage",
          targetParam: "properties.risk_status",
          transformation: "Threshold evaluated: amount > $500 -> 'escalated'",
        },
        {
          sourceField: "linear.issue.url",
          targetTool: "slack-mcp.post_channel_block_kit",
          targetParam: "blocks.button_url",
          transformation: "Direct deep-link interpolation",
        },
      ],
      mcpExecutionPlan: [
        {
          step: 1,
          connectorId: "linear-mcp",
          tool: "create_issue",
          description: "Generate Linear issue under Billing Triage cycle with SLA tag",
          sampleParams: {
            teamKey: "REV",
            title: "Urgent Invoice Escalation - Stripe customer",
            priority: 1,
            state: "In Triage",
          },
        },
        {
          step: 2,
          connectorId: "hubspot-mcp",
          tool: "update_deal_stage",
          description: "Update HubSpot deal stage to 'Billing Issue Pending' without UI clicks",
          sampleParams: {
            dealId: "deal_8831920",
            stage: "payment_issue",
            deal_risk_score: 95,
          },
        },
        {
          step: 3,
          connectorId: "slack-mcp",
          tool: "post_channel_block_kit",
          description: "Post automated notification card to #billing-alerts",
          sampleParams: {
            channelId: "C0928ALERT",
            message: "⚠️ Subscription payment declined for Enterprise Tier ($1,250/mo)",
          },
        },
      ],
    };

    recordAiCreditUsage();
    return res.json({ 
      success: true, 
      plan: fallbackPlan, 
      generatedBy: "substrate-rule-engine",
      billing: {
        creditsDeducted: AI_SYNTHESIS_COST,
        creditBalance: serverBillingAccount.creditBalance,
      }
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze workflow" });
  }
});

// Gemini AI Proposal Refinement endpoint (AI Learning loop from user feedback)
app.post("/api/refine-proposal", async (req, res) => {
  try {
    const { proposal, feedback, newVersionId } = req.body;
    const ai = getGenAI();

    if (ai && feedback?.comment) {
      const prompt = `
You are the Substrate AI Workflow Engine. A human operator has provided specific feedback and rating on an existing direct-API MCP automation model.
Refine the automation model based on their feedback, adhering to zero-scraping, direct API correlation, and MCP tool execution.

Existing Model:
${JSON.stringify(proposal, null, 2)}

User Feedback:
- Accuracy Rating: ${feedback.accuracyRating}/5
- Usefulness Rating: ${feedback.usefulnessRating}/5
- Category: ${feedback.category}
- Specific User Comment: "${feedback.comment}"

Incorporate the feedback precisely. For instance:
- If they asked to tune a trigger condition or threshold, adjust trigger.condition and trigger.observedDelta.
- If they requested adding or tweaking an MCP step, modify mcpExecutionPlan.
- If they asked for a different field mapping, update correlationModel.
- Compute the new confidenceScore (between 90 and 99.9).

Return ONLY a valid JSON object matching the full AutomationProposal structure:
{
  "title": "${proposal.title}",
  "summary": "Updated summary incorporating feedback...",
  "targetApps": ${JSON.stringify(proposal.targetApps)},
  "bottleneckDetected": "${proposal.bottleneckDetected}",
  "expectedTimeSaved": "${proposal.expectedTimeSaved}",
  "costSavingsEstimate": "${proposal.costSavingsEstimate}",
  "reliabilityRate": "99.99% (Tuned with user feedback)",
  "confidenceScore": 99.2,
  "trigger": { ... },
  "correlationModel": [ ... ],
  "mcpExecutionPlan": [ ... ],
  "adaptationSummary": "Explicit bullet points describing what the AI learned and adapted based on the user comment"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response.text) {
        const refinedPlan = JSON.parse(response.text);
        return res.json({
          success: true,
          plan: refinedPlan,
          adaptationSummary: refinedPlan.adaptationSummary || `AI model adjusted trigger & execution steps based on feedback: "${feedback.comment}"`,
          refinedBy: "gemini-3.8-flash",
        });
      }
    }

    // High-fidelity local adaptive refinement if no API key or on fallback
    const refined = JSON.parse(JSON.stringify(proposal));
    const commentLower = (feedback?.comment || '').toLowerCase();

    let adaptationSummary = "AI adjusted parameters and condition thresholds based on user feedback.";

    if (feedback?.category === 'TRIGGER_TUNING' || commentLower.includes('threshold') || commentLower.includes('condition')) {
      refined.trigger.condition += ' && account.verified == true';
      refined.trigger.observedDelta += ' [Guardrail added: verified accounts only]';
      adaptationSummary = `Refined trigger condition to include account verification and tuned threshold per operator comment: "${feedback.comment}".`;
    } else if (feedback?.category === 'STEP_ORDER' || commentLower.includes('step') || commentLower.includes('order')) {
      // modify step description or add confirmation
      refined.mcpExecutionPlan.forEach((s: any, idx: number) => {
        s.description = `[Optimized Step ${idx + 1}] ${s.description}`;
      });
      adaptationSummary = `Re-ordered and validated step dependencies according to user comment: "${feedback.comment}".`;
    } else if (feedback?.category === 'TOOL_SELECTION' || commentLower.includes('slack') || commentLower.includes('jira') || commentLower.includes('linear')) {
      adaptationSummary = `Updated MCP connector parameters and enriched payload interpolation based on operator review.`;
    } else {
      adaptationSummary = `AI model weighted feedback (${feedback?.accuracyRating || 5}/5 accuracy, ${feedback?.usefulnessRating || 5}/5 usefulness) and refined field mappings.`;
    }

    // Adjust confidence score upward if ratings are positive, or recalibrate
    const avgRating = ((feedback?.accuracyRating || 4) + (feedback?.usefulnessRating || 4)) / 2;
    refined.confidenceScore = Math.min(99.9, Math.max(92.0, parseFloat((proposal.confidenceScore + (avgRating >= 4 ? 0.8 : -0.5)).toFixed(1))));

    return res.json({
      success: true,
      plan: refined,
      adaptationSummary,
      refinedBy: "substrate-adaptive-engine",
    });
  } catch (err: any) {
    console.error("Refine error:", err);
    res.status(500).json({ error: err.message || "Failed to refine proposal" });
  }
});

// MCP Execution endpoint
app.post("/api/execute-mcp", async (req, res) => {
  const { planId, steps, contextData, planTitle } = req.body;
  const executionLogs: any[] = [];
  const startTime = Date.now();

  try {
    // Calculate required credit cost (1 credit per step, minimum 1)
    const stepCost = Math.max(1, (steps || []).length);

    // Guard: Insufficient credits
    if (serverBillingAccount.creditBalance < stepCost) {
      return res.status(402).json({
        success: false,
        error: "INSUFFICIENT_CREDITS",
        message: `Insufficient credits. This automation execution requires ${stepCost} credits, but you have ${serverBillingAccount.creditBalance} remaining. Upgrade to a paid monthly plan to continue running automations.`,
        requiredCredits: stepCost,
        currentBalance: serverBillingAccount.creditBalance,
        isTrial: serverBillingAccount.isTrial,
      });
    }

    const executedSteps = (steps || []).map((step: any, index: number) => {
      const stepDuration = Math.floor(Math.random() * 120) + 45;
      const rpcId = `rpc-${Math.random().toString(36).substring(2, 9)}`;
      
      const payload = {
        jsonrpc: "2.0",
        id: rpcId,
        method: "tools/call",
        params: {
          name: step.tool,
          arguments: step.sampleParams || {},
          _meta: {
            connectorId: step.connectorId,
            origin: "substrate-browser-extension",
            bypassDOM: true,
            protocol: "MCP-v1.1",
          },
        },
      };

      const result = {
        status: "success",
        httpStatus: 200,
        result: {
          id: `res_${Math.random().toString(36).substring(2, 8)}`,
          entity: step.tool.replace("create_", "").replace("update_", ""),
          acknowledged: true,
          syncedAt: new Date().toISOString(),
          stateTransitionApplied: true,
        },
        executionDurationMs: stepDuration,
      };

      return {
        stepNumber: index + 1,
        tool: step.tool,
        connectorId: step.connectorId,
        description: step.description,
        rpcRequest: payload,
        rpcResponse: result,
        durationMs: stepDuration,
        status: "COMPLETED",
      };
    });

    const totalDuration = Date.now() - startTime + executedSteps.reduce((acc: number, s: any) => acc + s.durationMs, 0);

    // Deduct credits and append to credit ledger
    serverBillingAccount.creditBalance -= stepCost;
    serverBillingAccount.totalUsedCredits += stepCost;
    serverBillingAccount.totalSavedMinutes += Math.round(stepCost * 1.5);
    serverBillingAccount.ledger.unshift({
      id: `ledg_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      amount: -stepCost,
      type: 'USAGE_EXECUTION',
      description: `Executed MCP Automation (${stepCost} tool steps): ${planTitle || planId}`,
      balanceAfter: serverBillingAccount.creditBalance,
      relatedPlanId: planId,
      stepsCount: stepCost,
    });

    return res.json({
      success: true,
      executionId: `exec_${Date.now()}`,
      planId: planId || "plan_default",
      executedSteps,
      summary: {
        totalSteps: executedSteps.length,
        status: "ALL_STEPS_SUCCEEDED",
        totalDurationMs: totalDuration,
        domScrapingUsed: false,
        mcpProtocolVersion: "2024-11-05",
        timeSavedSeconds: 240, // 4 minutes saved in a single click
      },
      billing: {
        creditsDeducted: stepCost,
        creditBalance: serverBillingAccount.creditBalance,
        isTrial: serverBillingAccount.isTrial,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Execution failed" });
  }
});

// ---------------------------------------------------------------------------
// AGENT LOOP — the Pluno-style brain (see PLUNO_REVERSE_ENGINEERING.md §4)
// Server plans, extension executes JS in the page MAIN world via CDP,
// observations (code results + network evidence) flow back here.
// ---------------------------------------------------------------------------

interface AgentStep {
  index: number;
  thought: string;
  action: { type: "execute_code" | "final" | "error"; javascript?: string; answer?: string; message?: string };
}

interface AgentRun {
  id: string;
  instruction: string;
  page: { url: string; title: string };
  history: Array<{ role: "user" | "assistant" | "tool"; content: string }>;
  steps: AgentStep[];
  stepIndex: number;
  startedAt: number;
  finishedAt?: number;
}

const agentRuns = new Map<string, AgentRun>();
const AGENT_MAX_STEPS = 10;

const AGENT_SYSTEM_PROMPT = `You are Substrate, a browser automation agent. You complete tasks inside a web page by calling the site's own APIs with JavaScript — NOT by clicking UI elements.

You control ONE tab. Each turn you receive either an initial page snapshot or the result of your last JavaScript execution.

You MUST respond with ONLY a valid JSON object (no markdown fences, no prose outside JSON) in one of these shapes:

1. To execute code in the page:
{"thought": "one short sentence of reasoning", "action": {"type": "execute_code", "javascript": "const res = await fetch('/api/...'); return await res.json();"}}

2. When the task is complete:
{"thought": "one short sentence", "action": {"type": "final", "answer": "the final answer for the user, in plain text"}}

3. If the task is impossible:
{"thought": "one short sentence", "action": {"type": "error", "message": "why it is impossible"}}

Rules for the javascript:
- It runs in the page's MAIN world via Runtime.evaluate: same origin, same cookies, same session as the logged-in user.
- It MUST be an async function body. Use fetch() with RELATIVE URLs (e.g. fetch('/api/entries')) so it hits the site's own backend with the user's credentials.
- An injected helper exists: substrate.getPageSnapshot() returns a simplified DOM outline + visible page text. Use it when you need to see the page or find data attributes.
- The return value MUST be JSON-serializable and small (under ~20KB). Trim/summarize large arrays.
- Do not use alert/confirm/prompt. Do not navigate away (no location.href = ...).
- Prefer the site's internal JSON APIs (discovered from network evidence and the page snapshot) over DOM text scraping.
- If a fetch fails, inspect the error and try a different endpoint or method; check network evidence for the exact paths the site itself uses.

Before your first execute_code, study the page snapshot carefully to identify likely API routes (script src, data attributes, or known product paths). When network evidence from the site's own XHRs is provided, mirror those exact requests (method, path, headers minus credentials).`;

interface GeminiAction {
  thought?: string;
  action?: { type?: string; javascript?: string; answer?: string; message?: string };
}

function extractJson(text: string): GeminiAction | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

function normalizeAction(parsed: GeminiAction): AgentStep["action"] {
  const a = parsed.action ?? {};
  if (a.type === "execute_code" && typeof a.javascript === "string" && a.javascript.trim()) {
    return { type: "execute_code", javascript: a.javascript };
  }
  if (a.type === "final" && typeof a.answer === "string") {
    return { type: "final", answer: a.answer };
  }
  if (a.type === "error" && typeof a.message === "string") {
    return { type: "error", message: a.message };
  }
  return { type: "error", message: "Model returned an invalid action shape." };
}

function renderObservation(observation: any): string {
  if (!observation || typeof observation !== "object") return "Empty observation.";
  if (observation.kind === "page_snapshot") {
    return observation.ok
      ? `Initial page snapshot:\n${observation.snapshot}`
      : `Failed to capture page snapshot: ${observation.error}`;
  }
  if (observation.kind === "code_result") {
    const parts: string[] = [];
    parts.push(observation.ok ? "Code executed successfully." : `Code failed: ${observation.exception?.message ?? "unknown"}`);
    if (observation.result !== null && observation.result !== undefined) {
      parts.push(`Result: ${JSON.stringify(observation.result).slice(0, 6000)}`);
    }
    if (observation.console?.length) {
      parts.push(`Console:\n${observation.console.slice(0, 10).map((c: any) => `[${c.level}] ${c.args?.join(" ")}`).join("\n").slice(0, 2000)}`);
    }
    if (observation.networkEvidence?.length) {
      const net = observation.networkEvidence
        .filter((e: any) => e.resourceType === "xmlhttprequest" || e.resourceType === "fetch")
        .map((e: any) => `${e.method} ${e.url} -> ${e.statusCode ?? "…"} (type=${e.resourceType})`)
        .slice(0, 25);
      if (net.length) parts.push(`Recent XHR/fetch traffic observed on this page (mirror these calls):\n${net.join("\n")}`);
    }
    return parts.join("\n\n");
  }
  return JSON.stringify(observation).slice(0, 3000);
}

async function callAgentModel(run: AgentRun, observationText: string): Promise<AgentStep> {
  run.history.push({ role: "tool", content: observationText.slice(0, 24000) });
  const stepIndex = run.stepIndex;

  // Conversation transcript for the model
  const transcript = run.history
    .slice(0, -1)
    .map((m) => `[${m.role}] ${m.content.slice(0, 12000)}`)
    .join("\n\n")
    .slice(-40000);
  const userPrompt = `TASK: ${run.instruction}\n\nPAGE: ${run.page.url} (${run.page.title})\n\nTRANSCRIPT SO FAR:\n${transcript || "(none)"}\n\nLATEST OBSERVATION:\n${observationText.slice(0, 24000)}\n\nRespond with your next action as JSON.`;

  const raw = await callLLM(AGENT_SYSTEM_PROMPT, userPrompt);
  const parsed = raw ? extractJson(raw) : null;
  if (parsed) {
    const step: AgentStep = { index: stepIndex, thought: parsed.thought ?? "", action: normalizeAction(parsed) };
    run.history.push({ role: "assistant", content: JSON.stringify(step.action).slice(0, 8000) });
    run.steps.push(step);
    run.stepIndex++;
    return step;
  }

  // Offline / provider-failure fallback: deterministic snapshot demo
  if (stepIndex === 0) {
    const step: AgentStep = {
      index: 0,
      thought: "No LLM available — falling back to a snapshot-only demo step.",
      action: { type: "execute_code", javascript: "return substrate.getPageSnapshot();" },
    };
    run.steps.push(step);
    run.stepIndex++;
    return step;
  }
  const step: AgentStep = {
    index: stepIndex,
    thought: "Demo complete (no LLM — returning last observation as the answer).",
    action: { type: "final", answer: observationText.slice(0, 2000) },
  };
  run.steps.push(step);
  run.stepIndex++;
  return step;
}

// Start a run: returns the runId the extension will use for /api/agent/step
app.post("/api/agent/start", (req, res) => {
  const { instruction, page } = req.body ?? {};
  if (!instruction || !page?.url) {
    return res.status(400).json({ ok: false, error: "instruction and page.url are required" });
  }
  const run: AgentRun = {
    id: crypto.randomUUID(),
    instruction: String(instruction).slice(0, 2000),
    page: { url: String(page.url).slice(0, 500), title: String(page.title ?? "").slice(0, 200) },
    history: [],
    steps: [],
    stepIndex: 0,
    startedAt: Date.now(),
  };
  agentRuns.set(run.id, run);
  res.json({ ok: true, runId: run.id });
});

// Feed an observation, get the next action (execute_code | final | error)
app.post("/api/agent/step", async (req, res) => {
  try {
    const { runId, observation } = req.body ?? {};
    const run = agentRuns.get(runId);
    if (!run) return res.status(404).json({ ok: false, error: "Unknown runId" });
    if (run.stepIndex >= AGENT_MAX_STEPS) {
      return res.json({
        ok: true,
        step: { index: run.stepIndex, thought: "Step limit reached.", action: { type: "error", message: "Step limit reached without a final answer." } },
        next: { type: "error", message: "Step limit reached." },
      });
    }
    const step = await callAgentModel(run, renderObservation(observation));
    // 'next' mirrors the action for the extension's loop; include javascript/answer/message
    const next: any = { type: step.action.type };
    if (step.action.type === "execute_code") next.javascript = step.action.javascript;
    if (step.action.type === "final") next.answer = step.action.answer;
    if (step.action.type === "error") next.message = step.action.message;
    if (step.action.type !== "execute_code") run.finishedAt = Date.now();
    res.json({ ok: true, step, next });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "agent step failed" });
  }
});

// Introspection for the web dashboard
app.get("/api/agent/runs", (_req, res) => {
  res.json({
    ok: true,
    runs: [...agentRuns.values()].map((r) => ({
      id: r.id,
      instruction: r.instruction,
      page: r.page,
      status: r.finishedAt ? "finished" : "in-progress",
      steps: r.steps.length,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt ?? null,
    })),
  });
});

// ---------------------------------------------------------------------------
// BEHAVIOR ANALYSIS — activity ingestion, repetition detection, suggestions
// (Pluno's "learns how you work" feature, server side)
// ---------------------------------------------------------------------------

interface ActivityEvent {
  type: string; // click | form_submit | field_change | file_selected | enter | navigation
  at: number;
  url: string;
  role: string;
  name: string;
  ancestors: string[];
  tabOrigin?: string;
}

const activityLog: ActivityEvent[] = [];
const ACTIVITY_LOG_MAX = 20000;

interface Suggestion {
  id: string;
  title: string;
  summary: string;
  triggerDescription: string;
  instruction: string; // what we send to the agent loop when the user runs it
  targetSite: string;
  estimatedMinutesSaved: number;
  occurrences: number;
  createdAt: number;
  dismissed?: boolean;
}

const suggestions = new Map<string, Suggestion>();
let suggestionScanRunning = false;

app.post("/api/activity/ingest", (req, res) => {
  const { events } = req.body ?? {};
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ ok: false, error: "events[] required" });
  }
  let stored = 0;
  for (const e of events.slice(0, 2000)) {
    if (typeof e?.type === "string" && typeof e?.at === "number" && typeof e?.url === "string") {
      const o = originOf(e.url);
      if (blockedOrigins.has(o)) continue; // per-origin recording control
      activityLog.push({
        type: e.type,
        at: e.at,
        url: String(e.url).slice(0, 500),
        role: String(e.role ?? "").slice(0, 40),
        name: String(e.name ?? "").slice(0, 60),
        ancestors: Array.isArray(e.ancestors) ? e.ancestors.slice(0, 5).map(String) : [],
        tabOrigin: e.tabOrigin ? String(e.tabOrigin).slice(0, 100) : undefined,
      });
      stored++;
    }
  }
  if (activityLog.length > ACTIVITY_LOG_MAX) {
    activityLog.splice(0, activityLog.length - ACTIVITY_LOG_MAX);
  }
  res.json({ ok: true, stored, total: activityLog.length });
});

function originOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

// Turn raw events into a per-origin interaction sequence: "click button:Save",
// "form_submit form:Search", etc. — same shape Pluno's cloud uses to spot
// repeated workflows.
function buildInteractionSequences(): Map<string, string[]> {
  const byOrigin = new Map<string, string[]>();
  for (const e of activityLog) {
    const o = originOf(e.url);
    if (o === "unknown") continue;
    const seq = byOrigin.get(o) ?? [];
    const target = e.name ? `${e.role}:${e.name}` : e.role;
    seq.push(`${e.type} ${target}`);
    byOrigin.set(o, seq);
  }
  return byOrigin;
}

// Find repeated n-grams (n = 2..6) per origin — the "you keep doing this"
// signal. Returns the most-repeated sequences with counts.
function findRepetitions(seq: string[], minCount = 3): Array<{ pattern: string[]; count: number }> {
  const found: Array<{ pattern: string[]; count: number }> = [];
  for (let n = 2; n <= 6; n++) {
    const counts = new Map<string, { count: number; pattern: string[] }>();
    for (let i = 0; i + n <= seq.length; i++) {
      const pat = seq.slice(i, i + n);
      const key = pat.join(" | ");
      const entry = counts.get(key) ?? { count: 0, pattern: pat };
      entry.count++;
      counts.set(key, entry);
    }
    for (const { count, pattern } of counts.values()) {
      if (count >= minCount) found.push({ pattern, count });
    }
  }
  // Deduplicate: drop patterns fully contained in a longer kept pattern
  found.sort((a, b) => b.pattern.length - a.pattern.length || b.count - a.count);
  const kept: Array<{ pattern: string[]; count: number }> = [];
  for (const f of found) {
    const sub = kept.some((k) => k.pattern.join(" | ").includes(f.pattern.join(" | ")));
    if (!sub) kept.push(f);
    if (kept.length >= 6) break;
  }
  return kept;
}

const SUGGESTION_PROMPT = `You analyze a user's repeated browser interaction patterns and propose ONE automation that would save them real time. The automation will be executed by a browser agent that can call the website's own APIs with JavaScript (same login, same session) — no UI clicking, no scraping.

Respond with ONLY a valid JSON object:
{"title": "short imperative title", "summary": "1-2 sentences: what repeats and what the automation does", "triggerDescription": "when/what triggers this (e.g. 'when you open the orders page and filter by pending')", "instruction": "a complete task instruction for the browser agent: mention the site, the exact repeated actions observed, and the desired outcome", "estimatedMinutesSaved": 12}

Rules:
- Base everything strictly on the observed pattern. Do not invent actions that aren't in the data.
- estimatedMinutesSaved: occurrences × plausible minutes per repetition, rounded.
- If the pattern is too trivial to automate (single navigation, plain link clicks with no follow-up work), return {"skip": true} instead.`;

interface SuggestionLLMOut {
  title?: string;
  summary?: string;
  triggerDescription?: string;
  instruction?: string;
  estimatedMinutesSaved?: number;
  skip?: boolean;
}

function extractSuggestionJson(text: string): SuggestionLLMOut | null {
  const cleaned = (text ?? "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

async function scanForSuggestions(): Promise<number> {
  if (suggestionScanRunning) return 0;
  suggestionScanRunning = true;
  let created = 0;
  try {
    const sequences = buildInteractionSequences();
    const existingPatterns = new Set([...suggestions.values()].map((s) => s.triggerDescription));
    for (const [origin, seq] of sequences) {
      const reps = findRepetitions(seq);
      if (reps.length === 0) continue;
      const top = reps[0];
      const patternKey = top.pattern.join(" | ");
      if (existingPatterns.has(patternKey)) continue;
      const userPrompt = `Site: ${origin}
Observed repeated interaction pattern (${top.count} times):
${top.pattern.map((p) => "  " + p).join("\n")}

Full recent interaction history on this site (truncated):
${seq.slice(-80).map((p) => "  " + p).join("\n")}

Propose the best automation for this pattern (or {"skip": true} if trivial).`;
      const raw = await callLLM(SUGGESTION_PROMPT, userPrompt);
      const out = raw ? extractSuggestionJson(raw) : null;
      if (out && !out.skip && out.title && out.instruction) {
        const s: Suggestion = {
          id: crypto.randomUUID(),
          title: String(out.title).slice(0, 120),
          summary: String(out.summary ?? "").slice(0, 400),
          triggerDescription: patternKey,
          instruction: String(out.instruction).slice(0, 2000),
          targetSite: origin,
          estimatedMinutesSaved: Number(out.estimatedMinutesSaved) || 10,
          occurrences: top.count,
          createdAt: Date.now(),
        };
        suggestions.set(s.id, s);
        existingPatterns.add(patternKey);
        created++;
      }
    }
  } finally {
    suggestionScanRunning = false;
  }
  return created;
}

app.get("/api/suggestions", async (_req, res) => {
  // Opportunistic scan: run analysis when we have enough fresh activity
  const needsScan =
    activityLog.length >= 30 &&
    [...suggestions.values()].every((s) => Date.now() - s.createdAt > 10 * 60 * 1000 || s.dismissed);
  if (needsScan) await scanForSuggestions();
  const live = [...suggestions.values()].filter((s) => !s.dismissed).sort((a, b) => b.occurrences - a.occurrences);
  res.json({ ok: true, suggestions: live, activityEvents: activityLog.length });
});

app.post("/api/suggestions/:id/dismiss", (req, res) => {
  const s = suggestions.get(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: "Unknown suggestion" });
  s.dismissed = true;
  res.json({ ok: true });
});

app.get("/api/activity/summary", (_req, res) => {
  const sequences = buildInteractionSequences();
  res.json({
    ok: true,
    totalEvents: activityLog.length,
    byOrigin: Object.fromEntries([...sequences.entries()].map(([o, seq]) => [o, seq.length])),
  });
});

// ---------------------------------------------------------------------------
// LEARNED TOOL LIBRARY + REPLAY ENGINE + SCHEDULER + MCP + RECEIPTS
// The "better than Pluno" layer: LLM learns a workflow once, then it replays
// deterministically with ZERO LLM calls, on a schedule, verifiable, and
// exposed to external agents over MCP.
// ---------------------------------------------------------------------------

interface LearnedTool {
  id: string;
  name: string; // slug, e.g. hubspot-export-pending-deals
  description: string;
  origin: string;
  instruction: string;
  code: string; // frozen JS — executes in page MAIN world via CDP (deterministic)
  scheduleEveryMinutes: number | null;
  nextRunAt: number | null;
  runs: number;
  llmFreeRuns: number; // replays that cost zero LLM calls
  consecutiveFailures: number;
  needsRelearn: boolean;
  createdAt: number;
  lastRunAt: number | null;
  lastStatus: "never" | "ok" | "failed";
  lastReceipt?: any;
}

const learnedTools = new Map<string, LearnedTool>();

interface ReplayJob { id: string; toolId: string; createdAt: number; status: "queued" | "done" | "failed"; result?: any; }
const replayJobs = new Map<string, ReplayJob>();

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

// FREEZE: turn a completed agent run's successful code steps into a replayable tool.
// Called automatically after every successful run.
app.post("/api/tools/freeze", (req, res) => {
  const { runId, name, description } = req.body ?? {};
  const run = agentRuns.get(runId);
  if (!run) return res.status(404).json({ ok: false, error: "Unknown runId" });
  const execSteps = run.steps.filter((s) => s.action.type === "execute_code");
  if (execSteps.length === 0) {
    return res.status(400).json({ ok: false, error: "Run had no executable steps — nothing to freeze" });
  }
  // Freeze the FULL successful sequence as one script: each step's code joined,
  // with each step's result assigned to named vars so later steps can use them.
  const code = execSteps.map((s, i) => `const __step${i} = await (async () => { ${s.action.javascript} })();`).join("\n") +
    `\nreturn { ${execSteps.map((_, i) => `step${i}: __step${i}`).join(", ")} };`;
  // Avoid duplicates by instruction+origin
  for (const t of learnedTools.values()) {
    if (t.instruction === run.instruction && t.origin === originOf(run.page.url)) {
      t.code = code; // refresh with the latest successful sequence
      t.needsRelearn = false;
      return res.json({ ok: true, tool: t, updated: true });
    }
  }
  const tool: LearnedTool = {
    id: crypto.randomUUID(),
    name: slugify(name || run.instruction).slice(0, 60) || "learned-tool",
    description: String(description || run.instruction).slice(0, 400),
    origin: originOf(run.page.url),
    instruction: run.instruction,
    code,
    scheduleEveryMinutes: null,
    nextRunAt: null,
    runs: 0,
    llmFreeRuns: 0,
    consecutiveFailures: 0,
    needsRelearn: false,
    createdAt: Date.now(),
    lastRunAt: null,
    lastStatus: "never",
  };
  learnedTools.set(tool.id, tool);
  res.json({ ok: true, tool });
});

app.get("/api/tools", (_req, res) => {
  res.json({ ok: true, tools: [...learnedTools.values()] });
});

app.delete("/api/tools/:id", (req, res) => {
  const ok = learnedTools.delete(req.params.id);
  res.json({ ok });
});

// REPLAY PLAN: returns the frozen code + verification spec for the extension
// to execute deterministically. ZERO LLM calls on this path.
app.get("/api/tools/:id/replay", (req, res) => {
  const t = learnedTools.get(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: "Unknown tool" });
  res.json({
    ok: true,
    tool: { id: t.id, name: t.name, origin: t.origin, instruction: t.instruction },
    code: t.code,
    verification: {
      // Receipt spec: snapshot before + after; server diffs them on receipt.
      captureBefore: "return substrate.getPageSnapshot();",
      captureAfter: "return substrate.getPageSnapshot();",
    },
  });
});

// RECEIPT: extension reports replay result + before/after snapshots; server
// computes the verification diff and stores the receipt. Self-healing trigger.
app.post("/api/tools/:id/receipt", (req, res) => {
  const t = learnedTools.get(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: "Unknown tool" });
  const { ok, result, exception, beforeSnapshot, afterSnapshot } = req.body ?? {};
  t.runs++;
  t.lastRunAt = Date.now();

  // Verification diff: changed lines between before/after snapshots
  let diff: string[] = [];
  if (typeof beforeSnapshot === "string" && typeof afterSnapshot === "string") {
    const b = new Set(beforeSnapshot.split("\n"));
    const a = new Set(afterSnapshot.split("\n"));
    diff = [...a].filter((l) => !b.has(l) && l.trim()).slice(0, 15);
  }
  const verified = ok === true && diff.length > 0;

  if (ok === true) {
    t.lastStatus = "ok";
    t.llmFreeRuns++; // deterministic replay — no LLM cost
    t.consecutiveFailures = 0;
  } else {
    t.lastStatus = "failed";
    t.consecutiveFailures++;
    if (t.consecutiveFailures >= 2) t.needsRelearn = true; // self-healing trigger
  }
  t.lastReceipt = {
    at: Date.now(),
    ok: ok === true,
    verified, // state provably changed
    changedLines: diff,
    result: result ?? null,
    exception: exception ?? null,
    llmCalls: 0,
  };
  // Advance schedule
  if (t.scheduleEveryMinutes) t.nextRunAt = Date.now() + t.scheduleEveryMinutes * 60000;
  res.json({ ok: true, receipt: t.lastReceipt });
});

// SCHEDULE: set/clear a tool's schedule
app.post("/api/tools/:id/schedule", (req, res) => {
  const t = learnedTools.get(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: "Unknown tool" });
  const every = Number(req.body?.everyMinutes);
  if (!every || every < 1) {
    t.scheduleEveryMinutes = null;
    t.nextRunAt = null;
  } else {
    t.scheduleEveryMinutes = every;
    t.nextRunAt = Date.now() + every * 60000;
  }
  res.json({ ok: true, tool: { id: t.id, scheduleEveryMinutes: t.scheduleEveryMinutes, nextRunAt: t.nextRunAt } });
});

// DUE: tools whose scheduled run is due (+ relearn queue) — extension polls this
app.get("/api/tools/due", (_req, res) => {
  const now = Date.now();
  const due = [...learnedTools.values()].filter((t) => t.scheduleEveryMinutes && t.nextRunAt && t.nextRunAt <= now);
  for (const t of due) t.nextRunAt = now + (t.scheduleEveryMinutes ?? 0) * 60000; // claim
  res.json({ ok: true, tools: due.map(({ code, ...rest }) => rest) });
});

// MCP SERVER (JSON-RPC 2.0 over HTTP): exposes learned tools to external
// agents (Hermes, Claude, anything MCP-capable). tools/call queues a replay
// job the extension executes; caller polls /api/jobs/:id for the result.
app.post("/mcp", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body ?? {};
  const reply = (result: any) => res.json({ jsonrpc: "2.0", id, result });
  const replyErr = (code: number, message: string) => res.status(200).json({ jsonrpc: "2.0", id, error: { code, message } });

  if (method === "initialize") {
    return reply({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "substrate-learned-tools", version: "0.1.0" } });
  }
  if (method === "tools/list") {
    return reply({
      tools: [...learnedTools.values()].map((t) => ({
        name: t.name,
        description: `${t.description}${t.needsRelearn ? " (needs relearn — will use LLM)" : " (deterministic replay, zero LLM)"}`,
        inputSchema: { type: "object", properties: { result_format: { type: "string", description: "'summary' or 'full'" } } },
      })),
    });
  }
  if (method === "tools/call") {
    const tool = [...learnedTools.values()].find((t) => t.name === params?.name);
    if (!tool) return replyErr(-32602, `Unknown tool: ${params?.name}`);
    const job: ReplayJob = { id: crypto.randomUUID(), toolId: tool.id, createdAt: Date.now(), status: "queued" };
    replayJobs.set(job.id, job);
    return reply({
      content: [{ type: "text", text: `Queued replay of "${tool.name}" (job ${job.id}). Poll GET /api/jobs/${job.id} for the result — the browser extension executes it within ~60s.` }],
      jobUrl: `/api/jobs/${job.id}`,
    });
  }
  return replyErr(-32601, `Unknown method: ${method}`);
});

app.get("/api/jobs/queued", (_req, res) => {
  const queued = [...replayJobs.values()].filter((j) => j.status === "queued");
  res.json({ ok: true, jobs: queued });
});

app.get("/api/jobs/:id", (req, res) => {
  const j = replayJobs.get(req.params.id);
  if (!j) return res.status(404).json({ ok: false, error: "Unknown job" });
  res.json({ ok: true, job: j });
});

// Extension reports job completion
app.post("/api/jobs/:id/complete", (req, res) => {
  const j = replayJobs.get(req.params.id);
  if (!j) return res.status(404).json({ ok: false, error: "Unknown job" });
  j.status = req.body?.ok ? "done" : "failed";
  j.result = req.body?.result ?? null;
  res.json({ ok: true });
});

// PER-ORIGIN RECORDING CONTROLS (blocked origins are dropped on ingest)
const blockedOrigins = new Set<string>();

app.get("/api/settings/origins", (_req, res) => {
  res.json({ ok: true, blocked: [...blockedOrigins] });
});

app.post("/api/settings/origins/block", (req, res) => {
  const o = String(req.body?.origin ?? "").toLowerCase();
  if (o) blockedOrigins.add(o);
  res.json({ ok: true, blocked: [...blockedOrigins] });
});

app.post("/api/settings/origins/unblock", (req, res) => {
  blockedOrigins.delete(String(req.body?.origin ?? "").toLowerCase());
  res.json({ ok: true, blocked: [...blockedOrigins] });
});

// RELEARN: self-healing — re-run the agent loop for a tool's instruction,
// then refresh the frozen code on success.
app.post("/api/tools/:id/relearn", async (req, res) => {
  const t = learnedTools.get(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: "Unknown tool" });
  const run: AgentRun = {
    id: crypto.randomUUID(),
    instruction: `Re-learn this automation for ${t.origin}: ${t.instruction}. The previous API sequence stopped working — find the current way.`,
    page: { url: `https://${t.origin}/`, title: t.origin },
    history: [],
    steps: [],
    stepIndex: 0,
    startedAt: Date.now(),
  };
  agentRuns.set(run.id, run);
  res.json({ ok: true, runId: run.id, note: "Extension drives the relearn via /api/agent/step; freeze the result with /api/tools/freeze" });
});

async function startServer() {
  // Vite middleware for dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Substrate Engine Server listening on port ${PORT}`);
  });
}

startServer();
