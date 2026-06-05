import { useState, useEffect, useRef } from 'react';
import { feedbackApi } from '../api/feedback';

interface Props {
  inline?: boolean;
}

function FeedbackForm({
  stars, setStars, comment, setComment, isSubmitting, submitted,
  onSubmit, onEdit,
}: {
  stars: number; setStars: (n: number) => void;
  comment: string; setComment: (s: string) => void;
  isSubmitting: boolean; submitted: boolean;
  onSubmit: () => void; onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(0);
  const displayStars = hovered || stars;

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} className={`w-6 h-6 ${s <= stars ? 'text-[#F5A623]' : 'text-gray-200 dark:text-neutral-700'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        {comment && <p className="text-xs text-gray-600 dark:text-neutral-300 text-center italic">"{comment}"</p>}
        <p className="text-xs text-[#7A60F4] font-semibold">Thank you!</p>
        <button onClick={onEdit} className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 underline underline-offset-2 transition-colors">
          Edit feedback
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStars(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`${s} star${s !== 1 ? 's' : ''}`}
          >
            <svg className={`w-7 h-7 transition-colors ${s <= displayStars ? 'text-[#F5A623]' : 'text-gray-200 dark:text-neutral-700'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      {stars > 0 && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you think... (optional)"
          rows={3}
          className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#7A60F4]/50 outline-none resize-none transition-all placeholder-gray-300 dark:placeholder-neutral-600"
        />
      )}
      <button
        onClick={onSubmit}
        disabled={!stars || isSubmitting}
        className="w-full px-4 py-2 bg-[#7A60F4] hover:bg-[#6B52E8] text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      >
        {isSubmitting ? 'Sending...' : 'Submit'}
      </button>
    </div>
  );
}

export function FeedbackWidget({ inline = false }: Props) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedbackApi.getMine()
      .then((data) => {
        if (data) { setStars(data.stars); setComment(data.comment); setSubmitted(true); }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (inline || !open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, inline]);

  const handleSubmit = async () => {
    if (!stars) return;
    setIsSubmitting(true);
    try {
      await feedbackApi.submit(stars, comment);
      setSubmitted(true);
    } catch (err) {
      console.error('Feedback submit failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loaded) return null;

  // ── Inline card (Settings page) ──────────────────────────────────────────
  if (inline) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm transition-colors">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#F5A623]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Share your feedback
        </h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">How are you finding the app? Your feedback helps us improve.</p>
        <FeedbackForm
          stars={stars} setStars={setStars}
          comment={comment} setComment={setComment}
          isSubmitting={isSubmitting} submitted={submitted}
          onSubmit={handleSubmit} onEdit={() => setSubmitted(false)}
        />
      </div>
    );
  }

  // ── Header dropdown ───────────────────────────────────────────────────────
  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded-lg transition-colors ${open ? 'bg-[#7A60F4]/10 text-[#7A60F4]' : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
        title="Feedback"
      >
        <svg className={`w-5 h-5 ${open ? 'text-[#7A60F4]' : 'text-[#F5A623]'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Share your feedback</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3">How are you finding the app?</p>
            <FeedbackForm
              stars={stars} setStars={setStars}
              comment={comment} setComment={setComment}
              isSubmitting={isSubmitting} submitted={submitted}
              onSubmit={handleSubmit} onEdit={() => setSubmitted(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
