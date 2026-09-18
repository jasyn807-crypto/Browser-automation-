import React, { useState } from 'react';
import { 
  X, 
  Search, 
  GitMerge, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Zap, 
  ShieldCheck, 
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { McpConnector } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  connectors: McpConnector[];
}

export const McpRegistryModal: React.FC<Props> = ({ isOpen, onClose, connectors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inspectedConnector, setInspectedConnector] = useState<McpConnector | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Project Management', 'CRM & Sales', 'Payments & Finance', 'Knowledge & Docs', 'Communication', 'DevOps & Engineering'];

  const filtered = connectors.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.popularTools.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full p-6 text-slate-100 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <GitMerge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pre-trained MCP Connector Registry
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                50,000+ Connectors Pre-Trained
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Universal Model Context Protocol tool contracts pre-trained across enterprise web software and APIs
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="my-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across 50,000+ connectors (e.g. Linear, Jira, Stripe, HubSpot, Notion, Slack, Zendesk)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1 pb-4">
          {filtered.map((connector) => (
            <div
              key={connector.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">
                    {connector.category}
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    v{connector.version}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                  {connector.name}
                </h4>

                <div className="text-xs text-slate-400 mb-3">
                  <strong className="text-slate-200 font-mono">{connector.toolsCount}</strong> tools defined
                </div>

                {/* Popular tools preview */}
                <div className="space-y-1 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Supported Tools:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {connector.popularTools.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-purple-300 border border-slate-800"
                      >
                        {tool}
                      </span>
                    ))}
                    {connector.popularTools.length > 3 && (
                      <span className="text-[10px] text-slate-500 self-center">
                        +{connector.popularTools.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectedConnector(connector)}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1 transition-colors mt-2"
              >
                <span>Inspect Tool Schema</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Schema Inspector Submodal / Overlay */}
        {inspectedConnector && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold text-white">
                  {inspectedConnector.name} Schema Definition (Model Context Protocol)
                </span>
              </div>
              <button
                onClick={() => setInspectedConnector(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Schema
              </button>
            </div>

            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-40 leading-relaxed">
              {JSON.stringify(inspectedConnector.schemaSample, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Every connector adheres to standard MCP tools/call specifications with strict schema validation.
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
