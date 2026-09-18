import { ClientBillingAccount, CreditAddonPack, SubscriptionTier } from '../types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free_starter',
    name: 'Free Trial',
    badge: 'Sample Credits Included',
    tagline: 'Experience passive API observation and test zero-scraping MCP executions.',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    creditsPerMonth: 50,
    isPopular: false,
    mcpConcurrencies: 1,
    rateLimitPerMin: 15,
    features: [
      '50 Sample Free Credits (One-time test grant)',
      '1 Concurrent autonomous MCP workflow',
      'Passively intercept background REST & GraphQL',
      'Community pre-trained MCP connector catalog',
      'Standard JSON-RPC direct execution',
      'Basic error & retry diagnostics',
    ],
  },
  {
    id: 'pro_operator',
    name: 'Pro Operator',
    badge: 'Most Popular',
    tagline: 'For fast-moving engineers and operators needing reliable cross-SaaS automations.',
    monthlyPrice: 49,
    annualMonthlyPrice: 39,
    creditsPerMonth: 600,
    isPopular: true,
    mcpConcurrencies: 5,
    rateLimitPerMin: 60,
    features: [
      '600 Monthly MCP Automation Credits ($0.08 / use)',
      '5 Concurrent autonomous background pipelines',
      'All 50,000+ pre-trained MCP connectors',
      'Gemini 3.8 Flash AI synthesis & workflow tuning',
      'Zero-scraping direct API state correlation engine',
      'Circuit breaker failover & latency benchmarks',
      'Rollback revisions & version control commits',
      'Email alerts & webhook dispatch',
    ],
  },
  {
    id: 'business_team',
    name: 'Business Team',
    badge: 'For Growing Teams',
    tagline: 'Multi-seat workspace with high-throughput MCP orchestration and SLA protection.',
    monthlyPrice: 149,
    annualMonthlyPrice: 119,
    creditsPerMonth: 2500,
    isPopular: false,
    mcpConcurrencies: 20,
    rateLimitPerMin: 240,
    features: [
      '2,500 Monthly MCP Automation Credits ($0.06 / use)',
      '20 Concurrent autonomous background pipelines',
      '5 Operator team seats included with RBAC',
      'Custom webhook listeners & bi-directional sync',
      'Advanced domain & payload redaction filters',
      'Priority RPC execution queue (p99 < 85ms)',
      'Dedicated Slack / Teams alert channel dispatch',
      '99.9% uptime execution SLA',
    ],
  },
  {
    id: 'enterprise_scale',
    name: 'Enterprise Dedicated',
    badge: 'Mission-Critical',
    tagline: 'Dedicated VPC connectors, custom security compliance, and high-volume throughput.',
    monthlyPrice: 499,
    annualMonthlyPrice: 399,
    creditsPerMonth: 10000,
    isPopular: false,
    mcpConcurrencies: 100,
    rateLimitPerMin: 1000,
    features: [
      '10,000 Monthly MCP Automation Credits ($0.05 / use)',
      'Unlimited concurrent pipeline dispatches',
      'Unlimited workspace operator seats',
      'Custom proprietary internal MCP server connectors',
      'On-premise / VPC gateway proxy support',
      'Custom corporate billing & monthly invoice payments',
      'Dedicated Solutions Architect & 24/7 pager SLA',
      'SOC2 / HIPAA payload sanitation compliance',
    ],
  },
];

export const CREDIT_ADDON_PACKS: CreditAddonPack[] = [
  {
    id: 'addon_150',
    name: 'Quick Refill',
    credits: 150,
    price: 15,
    badge: '$0.10 / credit',
  },
  {
    id: 'addon_500',
    name: 'Pro Pack',
    credits: 500,
    price: 45,
    badge: '$0.09 / credit',
    popular: true,
  },
  {
    id: 'addon_1500',
    name: 'Scale Surge',
    credits: 1500,
    price: 120,
    badge: '$0.08 / credit',
  },
  {
    id: 'addon_5000',
    name: 'Bulk Quota',
    credits: 5000,
    price: 350,
    badge: '$0.07 / credit',
  },
];

export const INITIAL_BILLING_ACCOUNT: ClientBillingAccount = {
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
      id: 'ledger_init_welcome',
      timestamp: 'Initial Signup',
      amount: 50,
      type: 'TRIAL_SAMPLE_GRANT',
      description: 'Welcome Grant: 50 Sample Free Trial Credits to test direct MCP automations',
      balanceAfter: 50,
    },
  ],
  invoices: [],
};

// Credit Consumption Rates
export const CREDIT_COSTS = {
  PER_MCP_STEP: 1, // 1 credit per MCP RPC tool call
  BASE_PIPELINE_EXECUTION: 3, // Base cost for full multi-app proposal execution
  AI_SYNTHESIS: 5, // Gemini AI workflow extraction and schema correlation
};
