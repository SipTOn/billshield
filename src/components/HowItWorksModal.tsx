import React from 'react';
import { X, FileUp, Calculator, Send } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EAE4DA]">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DA]">
          <h3 className="font-serif text-2xl text-[#1C1917]">
            How BillShield works
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#78716C] hover:text-[#1C1917] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-5 text-sm text-[#78716C]">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 mt-0.5">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-[#1C1917]">1. Upload your bill</p>
              <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                Accepts any mobile, broadband, utility, or subscription bill in PDF or image format.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 mt-0.5">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-[#1C1917]">2. We check the maths</p>
              <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                All calculations are executed in deterministic code: line sums, tax check, gap vs usual amount, and vague charges.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 mt-0.5">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-[#1C1917]">3. Send one clear message</p>
              <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                If a line is unverified, get an inquiry message referencing only proven numbers to ask for a breakdown or refund.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EAE4DA] text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-10 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
