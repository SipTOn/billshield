import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

// Shown while the message is being written, so the wait feels short.
const STEPS = [
  { at: 0, label: 'Gathering the numbers our code checked' },
  { at: 2.5, label: 'Writing a short, polite message' },
  { at: 5.5, label: 'Checking every number against the maths' },
];

const TIPS = [
  'Messages that name the exact line and amount get clearer answers.',
  'You can edit anything before sending. We count how much you change.',
  'Polite and specific works better than angry and general.',
];

export const DraftingProgress: React.FC<{ provider?: string; lineLabel?: string }> = ({ provider, lineLabel }) => {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 0.5), 500);
    return () => clearInterval(id);
  }, []);
  const active = STEPS.reduce((acc, s, i) => (t >= s.at ? i : acc), 0);
  const tip = TIPS[Math.floor(t / 4) % TIPS.length];

  return (
    <div className="min-h-64 py-2" role="status" aria-live="polite">
      {/* Typing preview */}
      <div className="flex items-center gap-2 mb-4">
        <span className="bs-typing" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <span className="text-sm text-[#1C1917]">
          Writing to {provider || 'the provider'}
          {lineLabel ? ` about “${lineLabel}”` : ''}
        </span>
      </div>

      {/* Skeleton lines that look like a letter being written */}
      <div className="space-y-2.5 mb-5" aria-hidden="true">
        {[38, 92, 84, 70, 0, 88, 60].map((w, i) =>
          w === 0 ? (
            <div key={i} className="h-2" />
          ) : (
            <div key={i} className="bs-skeleton h-3 rounded-full" style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
          )
        )}
      </div>

      <ul className="space-y-1.5">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-2 text-[13px] ${
              i < active ? 'text-[#0F766E]' : i === active ? 'text-[#1C1917] font-medium' : 'text-[#A8A29E]'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {i < active ? <Check className="w-4 h-4" /> : i === active ? <span className="bs-spinner" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#EAE4DA]" />}
            </span>
            {s.label}
          </li>
        ))}
      </ul>

      <p key={tip} className="bs-fade-in mt-4 text-xs text-[#78716C]">
        {tip}
      </p>
    </div>
  );
};
