import { useState, useEffect, useCallback } from 'react';

type Step = {
  targetId: string;
  icon: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    targetId: 'resumes-tour-create',
    icon: '✨',
    title: 'Create a Resume Version',
    body: 'Click here to open 4 options:\n• Upload CV — import your existing PDF or Word file.\n• From Profile — generate a resume from your saved profile data.\n• Duplicate — copy an existing version as a starting point.\n• From Job Description — AI tailors your resume to a specific job posting in ~30 seconds.',
  },
  {
    targetId: 'resumes-tour-list',
    icon: '📋',
    title: 'Your Resume Versions',
    body: 'All your versions are listed here. You can have one per job, per language, or per role. Click any card to preview and edit it.',
  },
  {
    targetId: 'resumes-tour-toolbar',
    icon: '🛠️',
    title: 'Actions Toolbar',
    body: 'Export as PDF, share by link or email, or edit the content manually. If the resume was AI-tailored, "Show Changes" highlights exactly what was modified.',
  },
  {
    targetId: 'resumes-tour-content',
    icon: '📄',
    title: 'Resume Content',
    body: 'The full resume content appears here — summary, experience, skills, and more. Click "Edit Resume" to tweak any section by hand.',
  },
  {
    targetId: '',
    icon: '🚀',
    title: "Ready to go!",
    body: 'Click "Create Resume Version" → "From Job Description", paste the job posting URL or text, and let AI do the tailoring. Takes about 30 seconds.',
  },
];

const PAD = 10;
const TOOLTIP_W = 320;

type Rect = { top: number; left: number; width: number; height: number };

function getTooltipPosition(
  hl: Rect,
  tooltipW: number,
): { top: number; left: number; arrowLeft: number | null; arrowBottom: boolean } {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const tooltipH = 220;
  const gap = 14;

  const spaceBelow = vh - (hl.top + hl.height);
  const spaceAbove = hl.top;

  let top: number;
  let arrowBottom = false;

  if (spaceBelow >= tooltipH + gap) {
    top = hl.top + hl.height + gap;
  } else if (spaceAbove >= tooltipH + gap) {
    top = hl.top - tooltipH - gap;
    arrowBottom = true;
  } else {
    top = Math.max(16, Math.min(hl.top + hl.height / 2 - tooltipH / 2, vh - tooltipH - 16));
  }

  const idealLeft = hl.left + hl.width / 2 - tooltipW / 2;
  const left = Math.max(16, Math.min(idealLeft, vw - tooltipW - 16));

  const arrowCenter = hl.left + hl.width / 2;
  const arrowLeft = Math.max(16, Math.min(arrowCenter - left - 8, tooltipW - 32));

  return { top, left, arrowLeft, arrowBottom };
}

export function ResumesTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [highlight, setHighlight] = useState<Rect | null>(null);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isCentered = !currentStep.targetId;

  const updateHighlight = useCallback(() => {
    if (!currentStep.targetId) { setHighlight(null); return; }
    const el = document.getElementById(currentStep.targetId);
    if (!el) { setHighlight(null); return; }
    const r = el.getBoundingClientRect();
    setHighlight({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [currentStep.targetId]);

  useEffect(() => {
    if (!currentStep.targetId) {
      const t = setTimeout(() => setHighlight(null), 0);
      return () => clearTimeout(t);
    }
    const el = document.getElementById(currentStep.targetId);
    if (!el) {
      const t = setTimeout(() => setHighlight(null), 0);
      return () => clearTimeout(t);
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(updateHighlight, 380);
    return () => clearTimeout(t);
  }, [step, currentStep.targetId, updateHighlight]);

  useEffect(() => {
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [updateHighlight]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLast) onClose(); else setStep(s => s + 1);
      }
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isLast, step]);

  const tooltipPos = highlight ? getTooltipPosition(highlight, TOOLTIP_W) : null;

  const tooltipStyle: React.CSSProperties = isCentered
    ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_W }
    : tooltipPos
    ? { position: 'fixed', top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_W }
    : { display: 'none' };

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      {isCentered || !highlight ? (
        <div className="absolute inset-0 bg-black/55" />
      ) : (
        <>
          <div className="absolute bg-black/55" style={{ top: 0, left: 0, right: 0, height: Math.max(0, highlight.top) }} />
          <div className="absolute bg-black/55" style={{ top: highlight.top + highlight.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/55" style={{ top: highlight.top, left: 0, width: Math.max(0, highlight.left), height: highlight.height }} />
          <div className="absolute bg-black/55" style={{ top: highlight.top, left: highlight.left + highlight.width, right: 0, height: highlight.height }} />
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              top: highlight.top, left: highlight.left,
              width: highlight.width, height: highlight.height,
              borderRadius: 14,
              boxShadow: '0 0 0 2px rgba(122,96,244,0.7), 0 0 20px rgba(122,96,244,0.25)',
            }}
          />
        </>
      )}

      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 p-5 transition-all duration-300"
        style={tooltipStyle}
        onClick={e => e.stopPropagation()}
      >
        {tooltipPos && !tooltipPos.arrowBottom && highlight && (
          <div className="absolute -top-2 overflow-hidden" style={{ left: tooltipPos.arrowLeft ?? 24, width: 16, height: 8 }}>
            <div className="w-3 h-3 bg-white dark:bg-neutral-900 border-l border-t border-gray-100 dark:border-neutral-800 rotate-45 translate-y-1.5 translate-x-1.5" />
          </div>
        )}
        {tooltipPos && tooltipPos.arrowBottom && highlight && (
          <div className="absolute -bottom-2 overflow-hidden" style={{ left: tooltipPos.arrowLeft ?? 24, width: 16, height: 8 }}>
            <div className="w-3 h-3 bg-white dark:bg-neutral-900 border-r border-b border-gray-100 dark:border-neutral-800 rotate-45 -translate-y-1.5 translate-x-1.5" />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 h-1.5 bg-[#7A60F4]' : i < step ? 'w-1.5 h-1.5 bg-[#7A60F4]/40' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>
          <button onClick={onClose} className="text-[11px] text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors">
            Skip tour
          </button>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <span className="text-2xl shrink-0 mt-0.5">{currentStep.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{currentStep.title}</p>
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed whitespace-pre-line">{currentStep.body}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div className="flex-shrink-0 text-[11px] text-gray-400 dark:text-neutral-600">Use ← → keys</div>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep(s => s + 1))}
            className="flex-1 py-2 bg-[#7A60F4] hover:bg-[#6B52E8] text-white text-xs font-semibold rounded-xl transition-colors"
          >
            {isLast ? '🎉 Done!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
