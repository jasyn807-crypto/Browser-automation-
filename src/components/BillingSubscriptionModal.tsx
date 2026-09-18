import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  RotateCw,
  PlusCircle,
  FileText,
  AlertTriangle,
  Receipt,
  Download,
  Building2,
  Mail,
  Calendar,
  Lock,
  X,
  TrendingUp,
} from 'lucide-react';
import { ClientBillingAccount, CreditAddonPack, SubscriptionTier, SubscriptionTierId } from '../types';
import { SUBSCRIPTION_TIERS, CREDIT_ADDON_PACKS } from '../data/billingData';

interface BillingSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ClientBillingAccount;
  onUpdateAccount: (updated: ClientBillingAccount) => void;
  requiredCreditsNotice?: {
    required: number;
    current: number;
    actionName: string;
  } | null;
}

export const BillingSubscriptionModal: React.FC<BillingSubscriptionModalProps> = ({
  isOpen,
  onClose,
  account,
  onUpdateAccount,
  requiredCreditsNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'addons' | 'ledger' | 'invoices'>('tiers');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(account.billingCycle || 'monthly');
  const [selectedTierId, setSelectedTierId] = useState<SubscriptionTierId>(
    account.currentTierId === 'free_starter' ? 'pro_operator' : account.currentTierId
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier | null>(null);
  const [clientCompanyName, setClientCompanyName] = useState(account.clientName || 'Acme Corp');
  const [clientBillingEmail, setClientBillingEmail] = useState(account.clientEmail || 'billing@acme.corp');
  const [cardNumber, setCardNumber] = useState(`•••• •••• •••• ${account.paymentMethod?.last4 || '4242'}`);
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardHolder, setCardHolder] = useState(account.paymentMethod?.holderName || 'Billing Lead');

  // Selected invoice for receipt preview
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  if (!isOpen) return null;

  const currentTier = SUBSCRIPTION_TIERS.find((t) => t.id === account.currentTierId) || SUBSCRIPTION_TIERS[0];

  const handleOpenCheckout = (tier: SubscriptionTier) => {
    setCheckoutTier(tier);
    setIsCheckoutOpen(true);
    setFeedbackMessage(null);
  };

  const handleQuickFillCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('314');
    setCardHolder('Operations Lead');
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTier) return;

    setIsProcessing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: checkoutTier.id,
          billingCycle,
          clientName: clientCompanyName,
          clientEmail: clientBillingEmail,
          paymentMethod: {
            brand: 'Visa',
            last4: cardNumber.replace(/\s/g, '').slice(-4) || '4242',
            expMonth: cardExpiry.split('/')[0] || '12',
            expYear: '20' + (cardExpiry.split('/')[1] || '28'),
            holderName: cardHolder,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process monthly subscription charge');

      onUpdateAccount(data.account);
      setIsCheckoutOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Successfully charged monthly subscription for ${checkoutTier.name}! Granted ${checkoutTier.creditsPerMonth} credits.`,
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateMonthlyRenewal = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/billing/renew-monthly', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Monthly renewal simulation failed');

      onUpdateAccount(data.account);
      setFeedbackMessage({
        type: 'success',
        text: `Simulated monthly charge processed: Added ${data.invoice.creditsAllotted} credits and generated invoice ${data.invoice.invoiceNumber}.`,
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyAddonPack = async (pack: CreditAddonPack) => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/billing/buy-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to purchase credit pack');

      onUpdateAccount(data.account);
      setFeedbackMessage({
        type: 'success',
        text: `Charged $${pack.price} for ${pack.name}. Added +${pack.credits} credits to your balance!`,
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetTrial = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/billing/reset-trial', { method: 'POST' });
      const data = await res.json();
      onUpdateAccount(data.account);
      setFeedbackMessage({
        type: 'success',
        text: 'Reset balance to 50 sample free trial credits.',
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Credit & Subscription Management</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {account.isTrial ? 'Free Trial Active' : `${currentTier.name} Active`}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transparent per-use credit metering, sample free credits, and automated monthly subscription plans
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Required Credits Warning Banner if triggered by zero credits */}
        {requiredCreditsNotice && (
          <div className="px-6 py-3 bg-amber-950/60 border-b border-amber-800/60 flex items-center gap-3 text-amber-200 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Action paused:</span> {requiredCreditsNotice.actionName} requires{' '}
              <span className="font-bold text-amber-300">{requiredCreditsNotice.required} credits</span>, but you currently
              have <span className="font-bold text-amber-300">{requiredCreditsNotice.current} credits</span> remaining.
              Select a tier below or purchase an on-demand refill pack to proceed.
            </div>
          </div>
        )}

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-200 border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800 text-xs">
          {/* Credit Balance */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Credit Balance</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-xl font-black ${
                    account.creditBalance > 10 ? 'text-cyan-400' : 'text-amber-400'
                  }`}
                >
                  {account.creditBalance}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">/ {account.monthlyCreditQuota} quota</span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          {/* Current Tier */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Active Subscription</span>
              <span className="text-sm font-bold text-white block mt-0.5">{currentTier.name}</span>
              <span className="text-[10px] text-slate-400">
                {account.isTrial ? 'Includes 50 Sample Credits' : `$${currentTier.monthlyPrice}/mo recurring`}
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-950/80 border border-purple-800/40 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {/* Next Billing Date */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Next Renewal Cycle</span>
              <span className="text-sm font-bold text-slate-200 block mt-0.5">{account.nextBillingDate}</span>
              <span className="text-[10px] text-slate-400">{account.billingCycle === 'annual' ? 'Annual Cycle' : 'Monthly Cycle'}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-950/80 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

          {/* Value Delivered */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Efficiency Generated</span>
              <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                {account.totalSavedMinutes || 120} min saved
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{account.totalUsedCredits} credits consumed</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('tiers')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'tiers'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Subscription Tiers & Plans</span>
            </button>

            <button
              onClick={() => setActiveTab('addons')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'addons'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add-on Credit Packs</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'ledger'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Usage & Credit Ledger</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {account.ledger?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'invoices'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Invoices & Receipts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {account.invoices?.length || 0}
              </span>
            </button>
          </div>

          {/* Testing shortcut buttons */}
          <div className="flex items-center gap-2">
            {!account.isTrial && (
              <button
                onClick={handleSimulateMonthlyRenewal}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Simulates charging the client monthly and resetting credit quota"
              >
                <RotateCw className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Simulate Monthly Renewal</span>
              </button>
            )}

            <button
              onClick={handleResetTrial}
              disabled={isProcessing}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-[11px] border border-slate-800 transition-colors cursor-pointer"
              title="Reset back to 50 sample free trial credits for testing"
            >
              Reset to 50 Trial Credits
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SUBSCRIPTION TIERS */}
          {activeTab === 'tiers' && (
            <div className="space-y-6">
              {/* How Credits Work Explainer */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Transparent Per-Use Credit Metering
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1 MCP Tool Call = <span className="text-amber-300 font-semibold">1 Credit</span>. Average 3-step automation
                      costs <span className="text-amber-300 font-semibold">3 Credits</span>. Gemini AI synthesis costs{' '}
                      <span className="text-amber-300 font-semibold">5 Credits</span>. No hidden API markup or DOM scraping fees.
                    </p>
                  </div>
                </div>

                {/* Billing Interval Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'annual' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500 text-slate-950 font-black">SAVE 20%</span>
                  </button>
                </div>
              </div>

              {/* Tiers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const isCurrent = account.currentTierId === tier.id;
                  const price = billingCycle === 'annual' ? tier.annualMonthlyPrice : tier.monthlyPrice;

                  return (
                    <div
                      key={tier.id}
                      className={`relative flex flex-col justify-between rounded-2xl p-5 border transition-all ${
                        tier.isPopular
                          ? 'bg-slate-900/95 border-amber-500/60 shadow-xl shadow-amber-500/10'
                          : isCurrent
                          ? 'bg-slate-900/90 border-cyan-500/60 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Popular / Active Badge */}
                      {tier.isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md">
                          MOST POPULAR
                        </div>
                      )}
                      {isCurrent && !tier.isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 shadow-md">
                          CURRENT TIER
                        </div>
                      )}

                      <div>
                        {/* Tier Title */}
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-bold text-white">{tier.name}</h3>
                          {tier.id === 'free_starter' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              Sample
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 min-h-[32px] mb-4">{tier.tagline}</p>

                        {/* Price & Monthly Credits Display */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">${price}</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>
                          {billingCycle === 'annual' && tier.monthlyPrice > 0 && (
                            <div className="text-[11px] text-emerald-400 font-medium">Billed annually (${price * 12}/yr)</div>
                          )}

                          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Monthly Credits:</span>
                            <span className="text-xs font-black text-amber-400 font-mono">
                              ⚡ {tier.creditsPerMonth.toLocaleString()} / mo
                            </span>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <div className="space-y-2 mb-6">
                          {tier.features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tier Action Button */}
                      <div>
                        {isCurrent ? (
                          <button
                            disabled
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Currently Active</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCheckout(tier)}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                              tier.isPopular
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                            }`}
                          >
                            <span>
                              {tier.id === 'free_starter' ? 'Switch to Free Trial' : `Subscribe for $${price}/mo`}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ADD-ON CREDIT PACKS */}
          {activeTab === 'addons' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white">Instant Credit Add-on Top-ups</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Need extra credits mid-month without changing your subscription tier? Top up instantly on demand. Credits never
                  expire while your account is active.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {CREDIT_ADDON_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className={`p-5 rounded-2xl border bg-slate-900 flex flex-col justify-between ${
                      pack.popular ? 'border-amber-500/60 ring-1 ring-amber-500/20 shadow-lg' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pack.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {pack.badge}
                        </span>
                      </div>

                      <div className="mt-4 mb-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-amber-400">+{pack.credits.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">Credits</span>
                      </div>

                      <div className="text-base font-bold text-white mb-4">${pack.price} one-time charge</div>

                      <ul className="text-xs text-slate-300 space-y-1.5 mb-6">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Instantly added to balance</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Never expires</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Charged to {account.paymentMethod?.brand} (••{account.paymentMethod?.last4})</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => handleBuyAddonPack(pack)}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Buy for ${pack.price}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: USAGE & CREDIT AUDIT LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Credit Transaction & Usage Audit</h3>
                  <p className="text-xs text-slate-400">
                    Transparent real-time log tracking every execution, monthly tier grant, and AI synthesis deduction.
                  </p>
                </div>
                <div className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-3 py-1.5 rounded-lg border border-cyan-800/40">
                  Current Balance: {account.creditBalance} Credits
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Credit Delta</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {account.ledger && account.ledger.length > 0 ? (
                      account.ledger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {entry.timestamp}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                entry.type === 'USAGE_EXECUTION'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                  : entry.type === 'USAGE_AI_SYNTHESIS'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                  : entry.type === 'TRIAL_SAMPLE_GRANT'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {entry.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-200">{entry.description}</td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              entry.amount < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{entry.balanceAfter}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No credit transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: INVOICES & BILLING RECEIPTS */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Client Invoices & Charge History</h3>
                <p className="text-xs text-slate-400">
                  Detailed monthly subscription billing receipts and on-demand payment records for accounting.
                </p>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Plan / Add-on</th>
                      <th className="py-3 px-4">Credits Allotted</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {account.invoices && account.invoices.length > 0 ? (
                      account.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{inv.date}</td>
                          <td className="py-3 px-4 font-medium text-white">{inv.tierName}</td>
                          <td className="py-3 px-4 font-mono text-cyan-300">+{inv.creditsAllotted}</td>
                          <td className="py-3 px-4 font-mono font-bold text-white">${inv.amountCharged}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              PAID
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          {account.isTrial
                            ? 'Currently on Free Trial (50 Sample Free Credits included). Upgrades will generate invoices here.'
                            : 'No invoice records found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>End-to-end encrypted monthly billing. Stripe & MCP automated metering compliant.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Billing Hub
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CHECKOUT / CHARGE CLIENT MODAL */}
      {isCheckoutOpen && checkoutTier && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Subscribe & Charge Client</h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Plan:</span>
                <span className="font-bold text-white">{checkoutTier.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Billing Cycle:</span>
                <span className="font-medium text-slate-300 uppercase">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Monthly Credits Assigned:</span>
                <span className="font-bold text-amber-400">⚡ {checkoutTier.creditsPerMonth.toLocaleString()} credits / mo</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-200">Amount to Charge Today:</span>
                <span className="text-emerald-400">
                  ${billingCycle === 'annual' ? checkoutTier.annualMonthlyPrice * 12 : checkoutTier.monthlyPrice}
                </span>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubscribeSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Client Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="Acme Operations Corp"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Billing Email (Receipts sent here)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={clientBillingEmail}
                    onChange={(e) => setClientBillingEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="billing@acme.corp"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">Credit / Debit Card</label>
                  <button
                    type="button"
                    onClick={handleQuickFillCard}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Quickfill Test Card (4242)
                  </button>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="4242 4242 4242 4242"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Expires (MM/YY)</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="12/28"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">CVC / Security Code</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="888"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Charging Monthly Subscription...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>
                        Confirm & Charge $
                        {billingCycle === 'annual' ? checkoutTier.annualMonthlyPrice * 12 : checkoutTier.monthlyPrice}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: INVOICE RECEIPT PREVIEW */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Invoice & Receipt: {selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Date Issued:</span>
                <span className="text-white">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client:</span>
                <span className="text-white">{selectedInvoice.clientName || 'Acme Operations Corp'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Email:</span>
                <span className="text-white">{selectedInvoice.clientEmail || 'billing@acme.corp'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Service Line:</span>
                <span className="text-white">{selectedInvoice.tierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credits Granted:</span>
                <span className="text-amber-400">+{selectedInvoice.creditsAllotted} Credits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Instrument:</span>
                <span className="text-white">{selectedInvoice.paymentMethod}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                <span className="text-slate-300">Total Paid (USD):</span>
                <span className="text-emerald-400">${selectedInvoice.amountCharged}.00</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">Status: PAID • Stored in Substrate Billing Ledger</span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
