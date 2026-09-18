import React, { useState } from 'react';
import { 
  Radio, 
  Search, 
  Terminal, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Code2, 
  Eye, 
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { ObservedApiEvent } from '../types';

interface Props {
  events: ObservedApiEvent[];
  onClearEvents?: () => void;
}

export const NetworkInspector: React.FC<Props> = ({ events = [], onClearEvents }) => {
  const safeEvents = events || [];
  const [selectedEventId, setSelectedEventId] = useState<string>(safeEvents[0]?.id || '');
  const [filterApp, setFilterApp] = useState<string>('All');
  const [copied, setCopied] = useState(false);

  const filteredEvents = safeEvents.filter((e) => {
    if (filterApp === 'All') return true;
    return e.app === filterApp;
  });

  const activeEvent = safeEvents.find((e) => e.id === selectedEventId) || filteredEvents[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Background API &amp; State Diff Stream
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900/60">
                {events.length} frames intercepted
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Observing direct network software traffic behind browser tabs • Zero DOM/pixel scraping
            </p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 text-xs">
          {['All', 'Stripe', 'Linear', 'HubSpot', 'Slack'].map((app) => (
            <button
              key={app}
              onClick={() => setFilterApp(app)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterApp === app
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 min-h-[480px]">
        {/* Left List of Captured Events */}
        <div className="lg:col-span-5 p-3 space-y-2 overflow-y-auto max-h-[580px]">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No API events intercepted yet for this filter.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = activeEvent?.id === evt.id;
              const isError = evt.statusCode >= 400;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500/70 shadow-md ring-1 ring-blue-500/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        evt.method === 'GET'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60'
                          : evt.method === 'POST'
                          ? 'bg-blue-950 text-blue-400 border border-blue-900/60'
                          : evt.method === 'PATCH'
                          ? 'bg-amber-950 text-amber-400 border border-amber-900/60'
                          : 'bg-purple-950 text-purple-400 border border-purple-900/60'
                      }`}>
                        {evt.method}
                      </span>
                      <span className="font-semibold text-slate-200">{evt.app}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                        isError ? 'bg-rose-950 text-rose-300' : 'bg-slate-900 text-emerald-400'
                      }`}>
                        {evt.statusCode}
                      </span>
                      <span className="text-slate-500 text-[10px]">{evt.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-slate-300 truncate mb-1">
                    {evt.endpoint}
                  </p>

                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {evt.correlatedUserAction}
                  </div>

                  {/* State Diff preview tag */}
                  {evt.stateDiff && evt.stateDiff.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block" />
                      <span>Diff: {evt.stateDiff[0].field} &rarr; {String(evt.stateDiff[0].newValue)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Event Detail Inspector */}
        <div className="lg:col-span-7 p-5 bg-slate-950/60 flex flex-col justify-between overflow-y-auto max-h-[580px]">
          {activeEvent ? (
            <div className="space-y-4">
              {/* Event Header Banner */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-white">
                      {activeEvent.method} {activeEvent.endpoint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Target Application: <strong className="text-slate-200">{activeEvent.app}</strong> • Latency: <span className="text-cyan-400 font-mono">{activeEvent.latencyMs}ms</span> • Protocol: Direct HTTP/REST Frame
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(JSON.stringify(activeEvent, null, 2))}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy Raw Frame"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* State Diffs Panel */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Calculated Underlying State Diffs
                </h4>

                <div className="space-y-1.5">
                  {activeEvent.stateDiff && activeEvent.stateDiff.length > 0 ? (
                    activeEvent.stateDiff.map((diff, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">{diff.field}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-rose-400 line-through text-[11px]">{String(diff.oldValue ?? 'null')}</span>
                          <ArrowRight className="h-3 w-3 text-slate-500" />
                          <span className="text-emerald-400 font-bold">{String(diff.newValue)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-500 text-xs">
                      No state mutation detected for this read query.
                    </div>
                  )}
                </div>
              </div>

              {/* Payload Inspector */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  Intercepted Request Payload (Direct Software Layer)
                </h4>
                <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(activeEvent.payload, null, 2)}
                </pre>
              </div>

              {/* Response Inspector */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  API Response Frame
                </h4>
                <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                  {JSON.stringify(activeEvent.response, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              Select an API event to inspect its request payload and state transitions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
