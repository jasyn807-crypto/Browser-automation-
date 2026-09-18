import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Radio,
  Lock
} from 'lucide-react';
import { ConnectedTool } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tools: ConnectedTool[];
  onToggleAutonomous: (toolId: string) => void;
}

export const IntegrationsSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tools,
  onToggleAutonomous,
}) => {
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  if (!isOpen) return null;

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      setIsSyncingAll(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Project Management &amp; SaaS Integrations
              </h2>
              <p className="text-xs text-slate-400">
                Automatic synchronization with enterprise tools for autonomous direct API execution
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer mr-6"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Pinging Webhooks...' : 'Force Health Check'}</span>
          </button>
        </div>

        {/* Webhook & Listener Substrate Banner */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Autonomous Execution Bus:</strong> Approved proposals trigger direct API endpoints without manual human confirmation.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
            7 of 7 Connected
          </span>
        </div>

        {/* Tools List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1 pb-4">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                  {tool.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{tool.name}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {tool.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-slate-300">{tool.authMethod}</span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {tool.status}
                    </span>
                    <span>•</span>
                    <span>Ping: {tool.lastWebhookPing}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {tool.syncedEventsCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Frames Synced
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                  <span className="text-xs text-slate-300">Autonomous Mode:</span>
                  <button
                    onClick={() => onToggleAutonomous(tool.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      tool.autoExecuteAllowed ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        tool.autoExecuteAllowed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            Zero credentials stored client-side. All OAuth2 bearer tokens protected behind the server layer.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
