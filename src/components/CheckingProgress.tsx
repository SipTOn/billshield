import React, { useEffect, useState } from 'react';
import { Check, FileText } from 'lucide-react';

// Shown while the bill is being read and checked, so the wait feels short and clear.

const STEPS = [
  { at: 0, label: 'Reading your bill' },
  { at: 3, label: 'Finding every charge' },
  { at: 7, label: 'Checking the maths' },
  { at: 11, label: 'Looking for anything odd' },
];

const TIPS = [
  'Vague lines like "Other charges" or "Service fee" are the ones people most often can’t explain.',
  'Promo prices often end quietly after a few months. Your usual amount helps us spot the jump.',
  'Add-ons you tried once can keep renewing every month until you cancel them.',
  'Tax should match the rate printed on the bill. We check it with code, not AI.',
  'A polite message with exact numbers gets answered faster than a general complaint.',
  'Upload last month’s bill next time and we’ll point out anything new.',
];

export const CheckingProgress: React.FC<{
  fileName?: string;
  previewUrl?: string;
}> = ({ fileName, previewUrl }) => {
  const [seconds, setSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 0.5), 500);
    const tip = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4500);
    return () => {
      clearInterval(t);
      clearInterval(tip);
    };
  }, []);

  // Eases toward 92% so it never looks stuck and never claims to be done early
  const progress = Math.min(92, Math.round(92 * (1 - Math.exp(-seconds / 7))));
  const activeStep = STEPS.reduce((acc, s, i) => (seconds >= s.at ? i : acc), 0);

  return (
    <div
      className="bg-white border border-[#EAE4DA] rounded-[16px] p-5 sm:p-6 shadow-[0_2px_8px_rgba(28,25,23,0.04)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-4 sm:gap-5 items-start">
        {/* Scanning preview */}
        <div className="bs-scan relative w-[72px] h-[92px] sm:w-[84px] sm:h-[108px] shrink-0 rounded-lg overflow-hidden border border-[#EAE4DA] bg-[#FFFFFF]">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#0F766E]">
              <FileText className="w-7 h-7" />
            </div>
          )}
          <span className="bs-scan-line" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-serif text-[22px] text-[#1C1917] leading-tight">Checking your bill…</p>
          {fileName && <p className="text-xs text-[#78716C] truncate mt-1">{fileName}</p>}

          <ul className="mt-3 space-y-1.5">
            {STEPS.map((s, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <li
                  key={s.label}
                  className={`flex items-center gap-2 text-[13px] transition-colors ${
                    done ? 'text-[#0F766E]' : active ? 'text-[#1C1917] font-medium' : 'text-[#A8A29E]'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    {done ? (
                      <Check className="w-4 h-4" />
                    ) : active ? (
                      <span className="bs-spinner" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EAE4DA]" />
                    )}
                  </span>
                  {s.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-1.5 w-full rounded-full bg-[#EAE4DA] overflow-hidden">
        <div
          className="h-full bg-[#0F766E] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Rotating tip */}
      <div className="mt-4 p-3 rounded-xl bg-[#F0FDFA] border border-[#0F766E]/20 min-h-[64px]">
        <p className="text-[11px] font-medium text-[#0F766E] mb-0.5">Did you know?</p>
        <p key={tipIndex} className="bs-fade-in text-[13px] text-[#1C1917] leading-snug">
          {TIPS[tipIndex]}
        </p>
      </div>

      {seconds > 25 && (
        <p className="mt-3 text-xs text-[#78716C] text-center">
          Long or multi-page bills take a little longer. Almost there…
        </p>
      )}
    </div>
  );
};
