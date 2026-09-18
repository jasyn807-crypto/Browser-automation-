import React from 'react';
import { 
  Zap, 
  Layers, 
  Cpu, 
  GitMerge, 
  ShieldCheck, 
  Radio, 
  SlidersHorizontal,
  Sparkles,
  ExternalLink,
  Filter,
  CreditCard
} from 'lucide-react';
import { ClientBillingAccount } from '../types';

interface NavbarProps {
  activeView: 'workspace' | 'stream' | 'proposals' | 'mcp' | 'integrations';
  setActiveView: (view: 'workspace' | 'stream' | 'proposals' | 'mcp' | 'integrations') => void;
  onOpenComparison: () => void;
  onOpenAiAnalysis: () => void;
  onOpenFilters?: () => void;
  onOpenBilling: () => void;
  billingAccount: ClientBillingAccount;
  observedCount: number;
  proposalsCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenComparison,
  onOpenAiAnalysis,
  onOpenFilters,
  onOpenBilling,
  billingAccount,
  observedCount,
  proposalsCount,
  sidebarOpen,
  setSidebarOpen,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Zap className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Substrate
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 tracking-wide">
                  MCP CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Direct API Software Layer • Zero DOM Scraping
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveView('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeView === 'workspace'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Web Workspace Simulator
            </button>
            <button
              onClick={() => setActiveView('stream')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeView === 'stream'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-blue-400" />
              API State Stream
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-950 text-blue-300 font-mono">
                {observedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveView('proposals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeView === 'proposals'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              Automation Proposals
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-mono">
                {proposalsCount}
              </span>
            </button>
            <button
              onClick={() => setActiveView('mcp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeView === 'mcp'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <GitMerge className="h-3.5 w-3.5 text-purple-400" />
              MCP Connectors (50,000+)
            </button>
            <button
              onClick={() => setActiveView('integrations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeView === 'integrations'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
              Tool Sync
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Live Credit Meter Pill */}
            <button
              onClick={onOpenBilling}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-sm group"
              title="Click to manage subscription tiers, sample free credits, and buy refills"
            >
              <div className="h-5 w-5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                <Zap className="h-3 w-3" />
              </div>
              <div className="text-left leading-none">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black font-mono text-white">
                    {billingAccount.creditBalance}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Credits</span>
                </div>
                <span className="text-[9px] text-amber-400 font-semibold block mt-0.5">
                  {billingAccount.isTrial ? 'Free Trial' : 'Monthly Tier'}
                </span>
              </div>
            </button>

            {onOpenFilters && (
              <button
                onClick={onOpenFilters}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                title="Configure Passive Learning Filter Rules (Websites, Action Types, Redactions)"
              >
                <Filter className="h-3.5 w-3.5 text-cyan-400" />
                <span>Passive Filters</span>
              </button>
            )}

            <button
              onClick={onOpenComparison}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-950/50 border border-amber-800/60 text-amber-300 hover:bg-amber-900/60 transition-colors"
              title="Compare Substrate Direct API Hooks vs Fragile DOM Scraping"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Why No DOM Scraping?</span>
            </button>

            <button
              onClick={onOpenAiAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Synthesize Workflow</span>
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                sidebarOpen 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Sidebar {sidebarOpen ? 'Open' : 'Closed'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
