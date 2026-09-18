import { ObservedApiEvent, PassiveFilterConfig } from '../types';

export interface FilterEvaluationResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
  redactedCount: number;
  sanitizedEvent: ObservedApiEvent;
}

/**
 * Matches a domain pattern such as "*.stripe.com" or "linear.app"
 */
export function matchDomainPattern(domainOrApp: string, pattern: string): boolean {
  const normApp = domainOrApp.toLowerCase().trim();
  const normPattern = pattern.toLowerCase().trim();

  // App name direct match (e.g. "Stripe" matches "*.stripe.com" or "stripe.com")
  if (normPattern.includes(normApp) || normApp.includes(normPattern.replace('*.', ''))) {
    return true;
  }

  // Wildcard match
  if (normPattern.startsWith('*.')) {
    const base = normPattern.slice(2);
    return normApp.endsWith(base) || normApp === base;
  }

  return normApp === normPattern;
}

/**
 * Classifies an event into an actionType
 */
export function classifyEventActionType(event: ObservedApiEvent): string {
  const method = event.method.toUpperCase();
  const endpoint = event.endpoint.toLowerCase();
  const app = event.app.toLowerCase();

  if (endpoint.includes('auth') || endpoint.includes('oauth') || endpoint.includes('token') || endpoint.includes('login')) {
    return 'auth_tokens';
  }

  if (endpoint.includes('upload') || endpoint.includes('multipart') || endpoint.includes('attachment')) {
    return 'file_upload';
  }

  if (app === 'stripe' || endpoint.includes('invoice') || endpoint.includes('payment') || endpoint.includes('refund') || endpoint.includes('charge')) {
    return 'financial_mutation';
  }

  if (method === 'GET' || method === 'HEAD') {
    return 'read_query';
  }

  if (method === 'PATCH' || method === 'PUT' || (event.stateDiff && event.stateDiff.length > 0)) {
    return 'data_entry_diff';
  }

  if (method === 'POST') {
    return 'form_submission';
  }

  return 'data_entry_diff';
}

/**
 * Recursively redacts sensitive keys from a JSON object
 */
export function redactSensitiveData(
  obj: any, 
  patterns: string[]
): { sanitized: any; redactedCount: number } {
  if (!obj || typeof obj !== 'object') return { sanitized: obj, redactedCount: 0 };

  let count = 0;
  const isArray = Array.isArray(obj);
  const result: any = isArray ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const isSensitive = patterns.some((pat) => key.toLowerCase().includes(pat.toLowerCase()));

    if (isSensitive) {
      result[key] = '[REDACTED_BY_FILTER]';
      count++;
    } else if (typeof val === 'object' && val !== null) {
      const child = redactSensitiveData(val, patterns);
      result[key] = child.sanitized;
      count += child.redactedCount;
    } else {
      result[key] = val;
    }
  }

  return { sanitized: result, redactedCount: count };
}

/**
 * Evaluates an observed event against the passive learning filter configuration
 */
export function evaluateFilter(
  event: ObservedApiEvent, 
  config: PassiveFilterConfig
): FilterEvaluationResult {
  if (!config.enabled) {
    return {
      allowed: true,
      redactedCount: 0,
      sanitizedEvent: event,
    };
  }

  // 1. Check Domain Exclusions first
  const activeExcludes = config.domainRules.filter((r) => r.enabled && r.type === 'exclude');
  for (const rule of activeExcludes) {
    if (matchDomainPattern(event.app, rule.pattern)) {
      return {
        allowed: false,
        reason: `Blocked by Domain Exclude rule: "${rule.pattern}" (${rule.description || 'Excluded host'})`,
        matchedRule: rule.id,
        redactedCount: 0,
        sanitizedEvent: event,
      };
    }
  }

  // 2. Check Action Type Rules
  const eventActionType = classifyEventActionType(event);
  const actionRule = config.actionTypes.find((a) => a.actionType === eventActionType);
  if (actionRule && actionRule.enabled && actionRule.rule === 'exclude') {
    return {
      allowed: false,
      reason: `Blocked by Action Type rule: Excluded "${actionRule.label}" (${actionRule.description})`,
      matchedRule: actionRule.id,
      redactedCount: 0,
      sanitizedEvent: event,
    };
  }

  // 3. Check Endpoint Exclusions
  for (const exc of config.endpointExclusions) {
    const cleanPattern = exc.replace('*', '');
    if (event.endpoint.toLowerCase().includes(cleanPattern.toLowerCase())) {
      return {
        allowed: false,
        reason: `Endpoint pattern matches exclude list: "${exc}"`,
        matchedRule: exc,
        redactedCount: 0,
        sanitizedEvent: event,
      };
    }
  }

  // 4. Check Payload Redaction Rules
  const activeRedactionPatterns = config.payloadRedactionRules
    .filter((r) => r.enabled)
    .map((r) => r.fieldPattern);

  const payloadRedaction = redactSensitiveData(event.payload, activeRedactionPatterns);
  const responseRedaction = redactSensitiveData(event.response, activeRedactionPatterns);
  const totalRedacted = payloadRedaction.redactedCount + responseRedaction.redactedCount;

  // Sanitize state diffs if any field matches
  const sanitizedStateDiff = (event.stateDiff || []).map((diff) => {
    const isSensitive = activeRedactionPatterns.some((pat) => diff.field.toLowerCase().includes(pat.toLowerCase()));
    if (isSensitive) {
      return {
        ...diff,
        oldValue: '[REDACTED]',
        newValue: '[REDACTED]',
      };
    }
    return diff;
  });

  const sanitizedEvent: ObservedApiEvent = {
    ...event,
    payload: payloadRedaction.sanitized,
    response: responseRedaction.sanitized,
    stateDiff: sanitizedStateDiff,
  };

  return {
    allowed: true,
    redactedCount: totalRedacted,
    sanitizedEvent,
  };
}
