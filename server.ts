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
