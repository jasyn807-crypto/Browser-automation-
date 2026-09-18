export interface ObservedApiEvent {
  id: string;
  timestamp: string;
  app: 'Stripe' | 'Linear' | 'HubSpot' | 'Jira' | 'Notion' | 'Slack' | 'GitHub';
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'GRAPHQL';
  endpoint: string;
  statusCode: number;
  payload: Record<string, any>;
  response: Record<string, any>;
  stateDiff: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  latencyMs: number;
  correlatedUserAction: string;
}

export interface CorrelationMapping {
  sourceField: string;
  targetTool: string;
  targetParam: string;
  transformation: string;
}

export interface McpExecutionStep {
  step: number;
  connectorId: string;
  tool: string;
  description: string;
  sampleParams: Record<string, any>;
}

export interface AutomationFeedback {
  id: string;
  proposalId: string;
  timestamp: string;
  accuracyRating: number; // 1 to 5
  usefulnessRating: number; // 1 to 5
  category: 'TRIGGER_TUNING' | 'FIELD_MAPPING' | 'TOOL_SELECTION' | 'STEP_ORDER' | 'RELIABILITY' | 'GENERAL';
  comment: string;
  userEmail?: string;
  aiAdaptationApplied: boolean;
  adaptationSummary?: string;
  scoreDelta?: number;
}

export interface AutomationVersion {
  versionId: string; // e.g. "v1.0", "v1.1"
  proposalId: string;
  timestamp: string;
  author: string;
  commitMessage: string;
  changeSummary: string[];
  snapshot: {
    title: string;
    summary: string;
    targetApps: string[];
    bottleneckDetected: string;
    expectedTimeSaved: string;
    costSavingsEstimate: string;
    reliabilityRate: string;
    confidenceScore: number;
    trigger: {
      type: string;
      sourceApp: string;
      endpoint: string;
      condition: string;
      observedDelta: string;
    };
    correlationModel: CorrelationMapping[];
    mcpExecutionPlan: McpExecutionStep[];
  };
}

export interface DomainFilterRule {
  id: string;
  pattern: string; // e.g. "*.stripe.com", "linear.app"
  type: 'include' | 'exclude';
  enabled: boolean;
  description?: string;
}

export interface ActionTypeFilterRule {
  id: string;
  actionType: 'form_submission' | 'data_entry_diff' | 'read_query' | 'file_upload' | 'auth_tokens' | 'financial_mutation';
  label: string;
  description: string;
  enabled: boolean;
  rule: 'include' | 'exclude';
}

export interface PayloadRedactionRule {
  id: string;
  fieldPattern: string; // e.g. "password", "cvv", "token"
  action: 'redact' | 'drop_frame';
  enabled: boolean;
}

export interface PassiveFilterConfig {
  enabled: boolean;
  domainRules: DomainFilterRule[];
  actionTypes: ActionTypeFilterRule[];
  payloadRedactionRules: PayloadRedactionRule[];
  endpointInclusions: string[];
  endpointExclusions: string[];
  captureStats: {
    totalEvaluated: number;
    captured: number;
    dropped: number;
    redactedFields: number;
  };
}

export interface McpToolHealthMetric {
  connectorId: string;
  tool: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number; // e.g. 99.7
  avgLatencyMs: number; // e.g. 42
  p95LatencyMs: number; // e.g. 115
  lastStatus: 'healthy' | 'degraded' | 'recovering';
}

export interface McpRetryEvent {
  id: string;
  timestamp: string;
  tool: string;
  connectorId: string;
  errorReason: string;
  errorCode: number;
  attemptNumber: number;
  maxAttempts: number;
  backoffMs: number;
  status: 'RECOVERED' | 'EXHAUSTED' | 'IN_FLIGHT';
  recoveryLatencyMs?: number;
}

export interface AutomationHealthMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number; // percentage, e.g. 99.4
  uptimeRate: number; // e.g. 99.98
  latencyBenchmarks: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    domScrapingEquivalentMs: number; // comparison metric, e.g. 1850ms
    speedupMultiplier: number; // e.g. 41x
  };
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: string; // e.g. "Exponential backoff with full jitter"
    circuitBreakerState: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
    autoRecoveredCount: number;
    unresolvedCount: number;
  };
  recentRetries: McpRetryEvent[];
  toolBreakdown: McpToolHealthMetric[];
  lastProbeTimestamp: string;
}

export interface AutomationProposal {
  id: string;
  title: string;
  summary: string;
  targetApps: string[];
  bottleneckDetected: string;
  expectedTimeSaved: string;
  costSavingsEstimate: string;
  reliabilityRate: string;
  trigger: {
    type: string;
    sourceApp: string;
    endpoint: string;
    condition: string;
    observedDelta: string;
  };
  correlationModel: CorrelationMapping[];
  mcpExecutionPlan: McpExecutionStep[];
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTING' | 'ACTIVE';
  confidenceScore: number;
  occurrenceCount: number;
  generatedBy?: string;
  createdAt: string;
  currentVersionId?: string;
  versions?: AutomationVersion[];
  feedbacks?: AutomationFeedback[];
  healthMetrics?: AutomationHealthMetrics;
}

export interface McpConnector {
  id: string;
  name: string;
  category: string;
  version: string;
  status: 'active' | 'synced' | 'pending';
  toolsCount: number;
  icon: string;
  popularTools: string[];
  schemaSample: Record<string, any>;
}

export interface ExecutionStepResult {
  stepNumber: number;
  tool: string;
  connectorId: string;
  description: string;
  rpcRequest: {
    jsonrpc: string;
    id: string;
    method: string;
    params: {
      name: string;
      arguments: Record<string, any>;
      _meta?: Record<string, any>;
    };
  };
  rpcResponse: {
    status: string;
    httpStatus: number;
    result: Record<string, any>;
    executionDurationMs: number;
  };
  durationMs: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface ExecutionRun {
  executionId: string;
  planId: string;
  planTitle: string;
  timestamp: string;
  executedSteps: ExecutionStepResult[];
  summary: {
    totalSteps: number;
    status: string;
    totalDurationMs: number;
    domScrapingUsed: boolean;
    mcpProtocolVersion: string;
    timeSavedSeconds: number;
  };
}

export interface ConnectedTool {
  id: string;
  name: string;
  category: string;
  authMethod: 'OAuth2 Token' | 'API Key' | 'Workspace App';
  status: 'Synced' | 'Listening' | 'Re-authenticating';
  syncedEventsCount: number;
  lastWebhookPing: string;
  autoExecuteAllowed: boolean;
}

export type SubscriptionTierId = 'free_starter' | 'pro_operator' | 'business_team' | 'enterprise_scale';

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  creditsPerMonth: number;
  isPopular?: boolean;
  features: string[];
  mcpConcurrencies: number;
  rateLimitPerMin: number;
}

export interface CreditLedgerEntry {
  id: string;
  timestamp: string;
  amount: number; // negative for usage (e.g. -3), positive for grants/charges (e.g. +50, +600)
  type: 'USAGE_EXECUTION' | 'USAGE_AI_SYNTHESIS' | 'TRIAL_SAMPLE_GRANT' | 'MONTHLY_TIER_CREDIT' | 'ADDON_PURCHASE' | 'BONUS_RELOAD';
  description: string;
  balanceAfter: number;
  relatedPlanId?: string;
  stepsCount?: number;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amountCharged: number;
  tierId: SubscriptionTierId;
  tierName: string;
  billingInterval: 'monthly' | 'annual';
  creditsAllotted: number;
  status: 'PAID' | 'REFUNDED';
  paymentMethod: string;
  clientName?: string;
  clientEmail?: string;
  downloadUrl?: string;
}

export interface CreditAddonPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  badge?: string;
  popular?: boolean;
}

export interface ClientBillingAccount {
  currentTierId: SubscriptionTierId;
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
  ledger: CreditLedgerEntry[];
  invoices: BillingInvoice[];
}
