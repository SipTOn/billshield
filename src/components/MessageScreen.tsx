import React, { useState, useEffect } from 'react';
import { formatMoney as fmtMoney } from '../utils/money';
import { AuditedBill, BillLine } from '../types/bill';
import { Copy, Check } from 'lucide-react';

interface MessageScreenProps {
  audit: AuditedBill;
  flaggedLine: BillLine;
  savedMessage?: string;
  onMessageChange?: (msg: string) => void;
  onSent: (draft: string, finalMessage: string) => void;
}

export const MessageScreen: React.FC<MessageScreenProps> = ({
  audit,
  flaggedLine,
  savedMessage,
  onMessageChange,
  onSent,
}) => {
  const [initialDraft, setInitialDraft] = useState<string>(savedMessage || '');
  const [editableMessage, setEditableMessage] = useState<string>(savedMessage || '');
  const [isLoading, setIsLoading] = useState<boolean>(!savedMessage);
  const [copied, setCopied] = useState<boolean>(false);

  const formatMoney = (amount: number) => fmtMoney(amount, audit.currency);

  useEffect(() => {
    if (savedMessage) {
      setEditableMessage(savedMessage);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const generateDraft = async () => {
      setIsLoading(true);

      const isWrong = flaggedLine.status === 'wrong';
      const defaultTemplate = isWrong
        ? `Dear ${audit.provider} Support,\n\nI am writing regarding my bill for ${audit.period} totaling ${formatMoney(
            audit.reportedTotal
          )}.\n\nUpon reviewing the statement, I identified a discrepancy with "${flaggedLine.label}" (${formatMoney(
            flaggedLine.amount
          )}). The arithmetic sum does not align with the reported total. Could you please review this calculation and issue a correction or credit to my account?\n\nThank you for your prompt help.`
        : `Dear ${audit.provider} Support,\n\nI am writing regarding my bill for ${audit.period} with a total of ${formatMoney(
            audit.reportedTotal
          )}${
            audit.gapVsUsual
              ? `, which is ${formatMoney(audit.gapVsUsual)} higher than my usual ${formatMoney(audit.usualAmount || 0)}`
              : ''
          }.\n\nI noticed an unexplained line item "${flaggedLine.label}" of ${formatMoney(
            flaggedLine.amount
          )}${audit.detectedTaxRate > 0 ? ` (exclusive of ${audit.detectedTaxRate}% tax)` : ''}. Could you please provide an itemized breakdown of what this charge entails and why it was added?\n\nThank you for your assistance.`;

      try {
        const response = await fetch('/api/generate-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: audit.provider,
            period: audit.period,
            status: flaggedLine.status,
            lineLabel: flaggedLine.label,
            lineAmount: flaggedLine.amount,
            total: audit.reportedTotal,
            currency: audit.currency,
            usualAmount: audit.usualAmount,
            gapVsUsual: audit.gapVsUsual,
            taxRate: audit.detectedTaxRate,
            facts: {
              linesTotal: audit.linesTotal,
              taxAmount: audit.computedTax,
              lineTaxImpact: audit.detectedTaxRate
                ? (flaggedLine.amount * (100 + audit.detectedTaxRate)) / 100
                : flaggedLine.amount,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Server error');
        }

        const data = await response.json();
        if (isMounted) {
          const finalDraft = data.message || defaultTemplate;
          setInitialDraft(finalDraft);
          setEditableMessage(finalDraft);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setInitialDraft(defaultTemplate);
          setEditableMessage(defaultTemplate);
          setIsLoading(false);
        }
      }
    };

    generateDraft();

    return () => {
      isMounted = false;
    };
  }, [audit, flaggedLine]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSend = () => {
    onSent(initialDraft, editableMessage);
  };

  const subjectLine = `Inquiry regarding bill charges – ${audit.provider} (${audit.period})`;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1917] tracking-tight">
          Draft your inquiry
        </h2>
        <p className="text-sm text-[#78716C] mt-1.5">
          Review, copy, or send this short message to {audit.provider}.
        </p>
      </div>

      {/* 5) Card styled like an email draft */}
      <div className="bg-white border border-[#EAE4DA] rounded-[16px] shadow-[0_2px_8px_rgba(28,25,23,0.04)] overflow-hidden mb-6">
        {/* Email Header */}
        <div className="px-6 py-4 border-b border-[#EAE4DA] space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#A8A29E] font-medium w-14">To:</span>
            <span className="text-[#1C1917] font-medium">{audit.provider} Customer Support</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#A8A29E] font-medium w-14">Subject:</span>
            <span className="text-[#78716C] truncate">{subjectLine}</span>
          </div>
        </div>

        {/* Roomy editable body (line-height 1.7, 20px padding) */}
        <div className="p-[20px]">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#A8A29E]">
              Writing draft with verified figures...
            </div>
          ) : (
            <textarea
              value={editableMessage}
              onChange={(e) => {
                const val = e.target.value;
                setEditableMessage(val);
                onMessageChange?.(val);
              }}
              rows={11}
              className="w-full bg-transparent text-sm text-[#1C1917] leading-[1.7] focus:outline-none resize-none font-sans"
              placeholder="Write your message..."
            />
          )}
        </div>
      </div>

      {/* Action buttons: Copy (outlined pill) and 'I sent it' (teal pill) */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleCopy}
          disabled={isLoading}
          className="flex-1 h-[48px] bg-white border border-[#EAE4DA] hover:border-[#0F766E] text-[#1C1917] font-medium rounded-full text-sm transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#0F766E]" />
              <span className="text-[#0F766E]">Copied to clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#78716C]" />
              <span>Copy</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !editableMessage.trim()}
          className="flex-1 h-[48px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#EAE4DA] disabled:text-[#A8A29E] disabled:cursor-not-allowed text-white font-medium rounded-full text-sm transition-colors shadow-xs"
        >
          I sent it
        </button>
      </div>
    </div>
  );
};
