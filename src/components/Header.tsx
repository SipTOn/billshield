import React from 'react';
import { Shield, ChevronLeft } from 'lucide-react';

export type NavStep = 'upload' | 'check' | 'message' | 'sent';

interface HeaderProps {
  currentStep: NavStep;
  onNavigateStep: (step: NavStep) => void;
  onBack?: () => void;
  canNavigateToCheck?: boolean;
  canNavigateToMessage?: boolean;
  canNavigateToSent?: boolean;
  onOpenHistory?: () => void;
  onOpenHowItWorks?: () => void;
  historyCount?: number;
}

const STEPS: { key: NavStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'check', label: 'Check' },
  { key: 'message', label: 'Message' },
  { key: 'sent', label: 'Done' },
];

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigateStep,
  onBack,
  canNavigateToCheck = false,
  canNavigateToMessage = false,
  canNavigateToSent = false,
  onOpenHistory,
  onOpenHowItWorks,
  historyCount = 0,
}) => {
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const isStepClickable = (index: number, key: NavStep) => {
    if (index === currentStepIndex) return false;
    if (key === 'upload') return true;
    if (key === 'check' && canNavigateToCheck) return true;
    if (key === 'message' && canNavigateToMessage) return true;
    if (key === 'sent' && canNavigateToSent) return true;
    return false;
  };

  return (
    <div className="w-full border-b border-[#EAE4DA] bg-[#FAF7F2]">
      {/* 1) Slim top bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Shield logo + 'BillShield' */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-serif text-2xl tracking-tight text-[#1C1917]">
            BillShield
          </span>
        </div>

        {/* Right: 'How it works' and 'History' text links */}
        <div className="flex items-center gap-5 text-sm text-[#78716C]">
          {onOpenHowItWorks && (
            <button
              type="button"
              onClick={onOpenHowItWorks}
              className="hover:text-[#0F766E] transition-colors"
            >
              How it works
            </button>
          )}

          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="hover:text-[#0F766E] transition-colors"
            >
              History {historyCount > 0 ? `(${historyCount})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* 3) Progress: thin 4-segment progress bar with Back button */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          {currentStep !== 'upload' && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-[#0F766E] hover:text-[#115E59] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>&lt; Back</span>
            </button>
          ) : (
            <div className="w-12" />
          )}

          <span className="text-[11px] text-[#78716C]">
            Step {currentStepIndex + 1} of 4
          </span>
        </div>

        {/* 4 thin segments */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {STEPS.map((step, idx) => {
            const isFilled = idx <= currentStepIndex;
            return (
              <div
                key={step.key}
                className={`h-full rounded-full transition-all duration-300 ${
                  isFilled ? 'bg-[#0F766E]' : 'bg-[#EAE4DA]'
                }`}
              />
            );
          })}
        </div>

        {/* Step names below */}
        <div className="grid grid-cols-4 gap-1.5 mt-1.5 text-center text-xs">
          {STEPS.map((step, idx) => {
            const isCurrent = step.key === currentStep;
            const isClickable = isStepClickable(idx, step.key);
            const isPast = idx < currentStepIndex;

            if (isCurrent) {
              return (
                <span key={step.key} className="text-[#0F766E] font-medium truncate">
                  {step.label}
                </span>
              );
            }

            if (isPast && isClickable) {
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => onNavigateStep(step.key)}
                  className="text-[#0F766E] hover:underline truncate"
                >
                  {step.label}
                </button>
              );
            }

            return (
              <span key={step.key} className="text-[#A8A29E] truncate">
                {step.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
