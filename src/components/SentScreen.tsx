import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { WordDiffResult } from '../utils/wordDiff';

interface SentScreenProps {
  diffResult: WordDiffResult;
  onReset: () => void;
}

export const SentScreen: React.FC<SentScreenProps> = ({
  diffResult,
  onReset,
}) => {
  const [showDiff, setShowDiff] = useState<boolean>(false);

  const wordsText =
    diffResult.totalChanged === 0
      ? 'You sent the draft without changes.'
      : `You changed ${diffResult.totalChanged} ${
          diffResult.totalChanged === 1 ? 'word' : 'words'
        }.`;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-20 text-center transition-all duration-200">
      {/* 6) Teal check in a soft circle */}
      <div className="w-16 h-16 rounded-full bg-[#F0FDFA] border border-[#0F766E]/20 text-[#0F766E] flex items-center justify-center mx-auto mb-6 shadow-2xs">
        <Check className="w-8 h-8 stroke-[2.5]" />
      </div>

      {/* Serif 'Sent. Nice work.' */}
      <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1917] mb-2 tracking-tight">
        Sent. Nice work.
      </h2>

      {/* One line 'You changed X words' */}
      <p className="text-[16px] text-[#78716C] leading-[1.6] mb-6 font-sans">
        {wordsText}
      </p>

      {/* Subtle diff toggle */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => setShowDiff(!showDiff)}
          className="text-xs text-[#78716C] hover:text-[#0F766E] underline transition-colors"
        >
          {showDiff ? 'Hide word diff' : 'Show word diff'}
        </button>
      </div>

      {showDiff && (
        <div className="mb-8 p-4 rounded-xl bg-white border border-[#EAE4DA] text-xs text-left leading-relaxed max-h-48 overflow-y-auto font-sans shadow-2xs">
          {diffResult.tokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <span key={idx} className="bg-[#CCFBF1] text-[#0F766E] px-1 py-0.5 rounded mx-0.5 font-medium">
                  {token.value}{' '}
                </span>
              );
            }
            if (token.type === 'removed') {
              return (
                <span key={idx} className="bg-[#FEE2E2] text-[#DC2626] line-through px-1 py-0.5 rounded mx-0.5">
                  {token.value}{' '}
                </span>
              );
            }
            return <span key={idx} className="text-[#1C1917]">{token.value} </span>;
          })}
        </div>
      )}

      {/* Link 'Check another bill' */}
      <div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center px-8 h-[48px] bg-[#0F766E] hover:bg-[#115E59] text-white font-medium rounded-full text-sm transition-colors shadow-xs"
        >
          Check another bill
        </button>
      </div>
    </div>
  );
};
