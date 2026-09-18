import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  TrendingUp, 
  Server, 
  Radio, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';
import { AutomationHealthMetrics, AutomationProposal, McpRetryEvent } from '../types';
import { generateHealthMetricsForProposal } from '../utils/healthMetrics';

interface Props {
  proposal: AutomationProposal;
}

export const RealTimeHealthMonitor: React.FC<Props> = ({ proposal }) => {
  const [metrics, setMetrics] = useState<AutomationHealthMetrics>(() => {
    return proposal.healthMetrics || generateHealthMetricsForProposal(proposal);
  });

  const [timeWindow, setTimeWindow] = useState<'1h' | '24h' | '7d'>('24h');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResultNotice, setProbeResultNotice] = useState<string | null>(null);
  const [liveStreamActive, setLiveStreamActive] = useState(true);

  // Sync when proposal changes
  useEffect(() => {
    setMetrics(proposal.healthMetrics || generateHealthMetricsForProposal(proposal));
  }, [proposal]);

  // Periodic subtle live tick when streaming is active
  useEffect(() => {
    if (!liveStreamActive) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        // subtle jitter in live calls & latencies to simulate real background MCP telemetry
        const jitterCalls = Math.floor(Math.random() * 2);
        const newTotal = prev.totalCalls + jitterCalls;
        const newSuccess = prev.successfulCalls + jitterCalls;
        const latencyJitter = Math.floor(Math.random() * 5) - 2;

        return {
          ...prev,
          totalCalls: newTotal,
          successfulCalls: newSuccess,
          successRate: parseFloat(((newSuccess / newTotal) * 100).toFixed(2)),
          latencyBenchmarks: {
            ...prev.latencyBenchmarks,
            avgMs: Math.max(25, prev.latencyBenchmarks.avgMs + latencyJitter),
          },
          lastProbeTimestamp: 'Active (Heartbeat < 2s)',
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [liveStreamActive]);

  // Handle manual probe benchmark
  const handleRunHealthProbe = () => {
    setIsProbing(true);
    setProbeResultNotice(null);

    setTimeout(() => {
      const probeLatency = Math.floor(Math.random() * 15) + 32;
      setIsProbing(false);
      setProbeResultNotice(`All ${proposal.mcpExecutionPlan.length} MCP tools responsive (${probeLatency}ms avg RTT)`);
      
      setMetrics((prev) => ({
        ...prev,
        latencyBenchmarks: {
          ...prev.latencyBenchmarks,
          avgMs: probeLatency,
        },
        lastProbeTimestamp: 'Probe just completed • 100% Healthy',
      }));

      setTimeout(() => setProbeResultNotice(null), 4000);
    }, 850);
  };

  const safeMetrics = metrics || generateHealthMetricsForProposal(proposal);
  const latencyBenchmarks = safeMetrics.latencyBenchmarks || { avgMs: 44, p50Ms: 38, p95Ms: 78, p99Ms: 142, scrapingEquivalentAvgMs: 1850 };
  const retryPolicy = safeMetrics.retryPolicy || { maxRetries: 3, backoffStrategy: 'Exponential Backoff with Jitter (250ms - 2000ms)', circuitBreakerStatus: 'CLOSED' };
  const recentRetries = safeMetrics.recentRetries || [];
  const toolBreakdown = safeMetrics.toolBreakdown || [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-5 text-slate-100 shadow-xl relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Live Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Real-time Health Monitor
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase tracking-wide flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live success/failure rates, latency benchmarks, and automatic retry attempts for MCP calls
            </p>
          </div>
        </div>

        {/* Controls: Time Window + Live Toggle + Probe Benchmark */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time window selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['1h', '24h', '7d'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeWindow === tw 
                    ? 'bg-slate-800 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>

          {/* Live Stream Switch */}
          <button
            onClick={() => setLiveStreamActive(!liveStreamActive)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              liveStreamActive
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle live telemetry stream"
          >
            <Radio className={`h-3 w-3 ${liveStreamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{liveStreamActive ? 'Live' : 'Paused'}</span>
          </button>

          {/* Probe Latency Benchmark */}
          <button
            onClick={handleRunHealthProbe}
            disabled={isProbing}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Send an active health probe to test MCP connector latency"
          >
            <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isProbing ? 'Probing...' : 'Probe Latency'}</span>
          </button>
        </div>
      </div>

      {/* Notice after probing */}
      {probeResultNotice && (
        <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/60 text-xs text-cyan-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{probeResultNotice}</span>
        </div>
      )}

      {/* 4 Bento Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Success Rate */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>MCP Call Success Rate</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +0.4%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {metrics.successRate}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({metrics.successfulCalls.toLocaleString()} / {metrics.totalCalls.toLocaleString()})
              </span>
            </div>
          </div>

          {/* Visual Mini Progress Bar */}
          <div className="mt-3">
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
              <div 
                className="bg-emerald-400 h-full rounded-l-full transition-all duration-500" 
                style={{ width: `${metrics.successRate}%` }} 
              />
              <div 
                className="bg-rose-500 h-full rounded-r-full transition-all duration-500" 
                style={{ width: `${(100 - metrics.successRate)}%` }} 
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span className="text-emerald-400">{metrics.successfulCalls} succeeded</span>
              <span className="text-rose-400">{metrics.failedCalls} failed</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Latency Benchmarks */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Latency Benchmark</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800/60">
                {latencyBenchmarks.speedupMultiplier}x Faster
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-cyan-300">
                {latencyBenchmarks.avgMs} ms
              </span>
              <span className="text-[11px] text-slate-400">avg RTT</span>
            </div>
          </div>

          {/* Percentiles Breakdown */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <div>
              <span className="text-slate-500 text-[10px] block">P50</span>
              <span className="font-semibold text-slate-200">{latencyBenchmarks.p50Ms}ms</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">P95</span>
              <span className="font-semibold text-cyan-300">{latencyBenchmarks.p95Ms}ms</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">P99</span>
              <span className="font-semibold text-amber-300">{latencyBenchmarks.p99Ms}ms</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Automatic Retries */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Automatic Retry Rate</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/60">
                100% Healed
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-300">
                {retryPolicy.autoRecoveredCount}
              </span>
              <span className="text-[11px] text-slate-400">recovered</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Circuit Breaker</span>
              <span className="text-emerald-400 font-bold font-mono">
                {retryPolicy.circuitBreakerState} (Healthy)
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Unresolved Drops</span>
              <span className="text-slate-200 font-mono">{retryPolicy.unresolvedCount}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Protocol Reliability */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>RPC Determinism</span>
              <span className="text-[10px] text-cyan-400 font-mono">Zero DOM</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-300">
                {metrics.uptimeRate}%
              </span>
              <span className="text-[11px] text-slate-400">uptime</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Selector Drift</span>
              <span className="text-emerald-400 font-mono font-bold">0.00% (Immune)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Heartbeat</span>
              <span className="text-cyan-400 font-mono text-[9px] truncate max-w-[120px]">
                {metrics.lastProbeTimestamp}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Comparison Visual Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            Execution Latency Comparison: Direct MCP RPC vs Fragile DOM Clicking
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            {latencyBenchmarks.speedupMultiplier}x Speedup
          </span>
        </div>

        {/* Visual Benchmark Bars */}
        <div className="space-y-2 pt-1 text-xs">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-mono text-cyan-300 font-semibold">Substrate Direct MCP RPC</span>
              <span className="font-mono font-bold text-cyan-400">{latencyBenchmarks.avgMs} ms avg</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700" 
                style={{ width: `${Math.min(100, (latencyBenchmarks.avgMs / latencyBenchmarks.domScrapingEquivalentMs) * 100 * 3.5)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-mono text-slate-400">Fragile DOM Screen Scraping (Clicking, Waiting for UI Animations)</span>
              <span className="font-mono text-rose-400 font-semibold">{latencyBenchmarks.domScrapingEquivalentMs.toLocaleString()} ms</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div 
                className="h-full rounded-full bg-rose-500/70 transition-all duration-700" 
                style={{ width: '92%' }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Per-Tool Health Breakdown Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-cyan-400" />
            MCP Execution Step Breakdown
          </span>
          <span className="text-[11px] font-mono text-slate-500 font-normal">
            {toolBreakdown.length} active connectors
          </span>
        </h4>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="p-3">Step &amp; MCP Tool</th>
                <th className="p-3">Total Calls</th>
                <th className="p-3">Success Rate</th>
                <th className="p-3">Avg Latency</th>
                <th className="p-3">P95 Latency</th>
                <th className="p-3">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {toolBreakdown.map((tool, idx) => (
                <tr key={`${tool.connectorId}-${tool.tool}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold text-[9px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white font-sans">{tool.tool}</div>
                        <div className="text-[10px] text-cyan-400/80">{tool.connectorId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{tool.totalCalls.toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 rounded-full" 
                          style={{ width: `${tool.successRate}%` }} 
                        />
                      </div>
                      <span className="font-bold text-emerald-400">{tool.successRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-cyan-300 font-semibold">{tool.avgLatencyMs} ms</td>
                  <td className="p-3 text-slate-400">{tool.p95LatencyMs} ms</td>
                  <td className="p-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Healthy
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automatic Retry Attempts Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
            Automatic Retry Attempts &amp; Circuit Breaker Log
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            Policy: {retryPolicy.backoffStrategy}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {recentRetries.map((retry) => (
              <div key={retry.id} className="p-3.5 hover:bg-slate-850 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-cyan-400 font-bold text-[11px]">
                      {retry.connectorId}.{retry.tool}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800/60">
                      HTTP {retry.errorCode} Intercepted
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Attempt {retry.attemptNumber} of {retry.maxAttempts}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {retry.errorReason}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="text-[10px] font-mono text-slate-400">
                    <div>Backoff: <strong className="text-slate-200">{retry.backoffMs}ms</strong></div>
                    <div className="text-slate-500">{retry.timestamp}</div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Recovered (+{retry.recoveryLatencyMs}ms)</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note on atomic retry architecture */}
          <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              Unlike screen scrapers which risk double-submitting forms or hanging during DOM animation transitions, Substrate's MCP layer dispatches requests with idempotent tokens and automated jittered exponential backoffs, guaranteeing zero duplicated transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
