import React, { useState } from 'react';
import { 
  Star, 
  Send, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  ArrowUpRight, 
  RefreshCw,
  Sliders,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { AutomationFeedback, AutomationProposal } from '../types';

interface Props {
  proposal: AutomationProposal;
  onSubmitFeedback: (proposalId: string, feedback: {
    accuracyRating: number;
    usefulnessRating: number;
    category: AutomationFeedback['category'];
    comment: string;
    userEmail?: string;
  }) => Promise<void>;
  onOpenVersions?: () => void;
}

export const ProposalFeedbackWidget: React.FC<Props> = ({
  proposal,
  onSubmitFeedback,
  onOpenVersions,
}) => {
  const [accuracyRating, setAccuracyRating] = useState<number>(5);
  const [usefulnessRating, setUsefulnessRating] = useState<number>(5);
  const [category, setCategory] = useState<AutomationFeedback['category']>('TRIGGER_TUNING');
  const [comment, setComment] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('operator@substrate.local');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const feedbacks = proposal.feedbacks || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmitFeedback(proposal.id, {
        accuracyRating,
        usefulnessRating,
        category,
        comment: comment.trim(),
        userEmail,
      });

      setComment('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { key: AutomationFeedback['category']; label: string; desc: string }[] = [
    { key: 'TRIGGER_TUNING', label: 'Trigger Tuning', desc: 'Condition adjustments, thresholds or event timing' },
    { key: 'FIELD_MAPPING', label: 'Field Mapping', desc: 'JSON parameter correlation or transformation formula' },
    { key: 'TOOL_SELECTION', label: 'Tool Selection', desc: 'Suggested different MCP tools or APIs' },
    { key: 'STEP_ORDER', label: 'Step Sequence', desc: 'Reorder execution steps or add dependencies' },
    { key: 'RELIABILITY', label: 'Reliability / Safety', desc: 'Safeguards, retries or validation checks' },
    { key: 'GENERAL', label: 'General Feedback', desc: 'Overall accuracy and operational usefulness' },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Model Accuracy &amp; Learning Feedback</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                Active Learning Loop
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Your feedback is used by the Gemini passive learner to adjust trigger rules and field mappings in future iterations.
            </p>
          </div>
        </div>

        {feedbacks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>{showHistory ? 'Hide Previous Feedback' : `View Past Feedback (${feedbacks.length})`}</span>
          </button>
        )}
      </div>

      {submitSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <strong className="font-bold">Feedback Submitted &amp; Model Refined!</strong> The AI engine calibrated the workflow and generated a new version snapshot.
          </div>
        </div>
      )}

      {/* Interactive Feedback Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Dual Star Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
          {/* Accuracy Rating */}
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
              1. Observed Accuracy of Correlated Model
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setAccuracyRating(star)}
                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors focus:outline-none"
                  title={`${star} out of 5 stars`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= accuracyRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>
              ))}
              <span className="text-[11px] font-mono text-amber-300 ml-2 font-bold">
                {accuracyRating}/5 {accuracyRating === 5 ? 'Perfect match' : accuracyRating >= 4 ? 'Accurate' : 'Needs adjustment'}
              </span>
            </div>
          </div>

          {/* Usefulness Rating */}
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
              2. Business Usefulness &amp; Time Saved
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setUsefulnessRating(star)}
                  className="p-1 text-slate-600 hover:text-emerald-400 transition-colors focus:outline-none"
                  title={`${star} out of 5 stars`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= usefulnessRating
                        ? 'text-emerald-400 fill-emerald-400'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>
              ))}
              <span className="text-[11px] font-mono text-emerald-300 ml-2 font-bold">
                {usefulnessRating}/5 {usefulnessRating === 5 ? 'High impact' : usefulnessRating >= 4 ? 'Very useful' : 'Minor utility'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
            Focus Area / Feedback Category
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  category === c.key
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
                title={c.desc}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Specific Observations &amp; Desired Corrections
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Please update the trigger condition to only execute when invoice attempt >= 2 and amount >= $1,000 to prevent false triggers..."
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            required
          />
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Triggers real-time AI parameter refinement &amp; creates new version snapshot</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Refining Model via AI...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Feedback &amp; Refine</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Past Feedback Log Panel */}
      {showHistory && feedbacks.length > 0 && (
        <div className="pt-3 border-t border-slate-900 space-y-2.5 animate-fade-in">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Feedback &amp; AI Adaptations Log ({feedbacks.length})
          </span>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {feedbacks.slice().reverse().map((fb) => (
              <div
                key={fb.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{fb.userEmail || 'Operator'}</span>
                    <span className="text-slate-500">• {fb.timestamp}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-cyan-300 uppercase">
                      {fb.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-amber-400">★ {fb.accuracyRating}/5 acc</span>
                    <span className="text-emerald-400">★ {fb.usefulnessRating}/5 use</span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  "{fb.comment}"
                </p>

                {fb.aiAdaptationApplied && fb.adaptationSummary && (
                  <div className="p-2 rounded bg-cyan-950/40 border border-cyan-900/50 text-[11px] text-cyan-200 flex items-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-300">AI Adaptation Applied:</strong> {fb.adaptationSummary}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
