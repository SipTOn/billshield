import React, { useState } from 'react';
import { formatMoney as fmtMoney, roundMoney } from '../utils/money';
import { ellipseFromBox } from '../utils/annotateBill';
import { AuditedBill, BillLine } from '../types/bill';
import { X, ZoomIn, CheckCircle2 } from 'lucide-react';
import { round2 } from '../utils/mathAudit';

interface CheckScreenProps {
  audit: AuditedBill;
  onRecognizeCharge: (lineId: string) => void;
  onProceedToMessage: (line: BillLine) => void;
  onReset: () => void;
}

export const CheckScreen: React.FC<CheckScreenProps> = ({
  audit,
  onRecognizeCharge,
  onProceedToMessage,
  onReset,
}) => {
  const [showMaths, setShowMaths] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const activeFlagged = audit.flaggedLines.filter((l) => !l.userRecognized);
  const isFullyResolved = activeFlagged.length === 0;

  // Primary flagged line
  const currentFlagged = activeFlagged[0];

  const formatMoney = (amount: number) => fmtMoney(amount, audit.currency);

  const getShortReason = (line: BillLine) => {
    if (line.reasons && line.reasons.length > 0) {
      const first = line.reasons[0];
      if (first.includes('Mathematical mismatch') || first.includes('differs from sum')) {
        return 'Math discrepancy with line items';
      }
      if (line.isVague && line.isNewVsLastMonth) return 'Vague label, new vs last month';
      if (line.isVague) return 'Vague label, lacks transparent itemization';
      if (line.isNewVsLastMonth) return 'New charge vs last month';
      return first;
    }
    return 'Unexplained charge';
  };

  // If all clear / resolved
  if (isFullyResolved) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F0FDFA] border border-[#0F766E]/20 text-[#0F766E] flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1917] mb-3">
          All clear
        </h2>
        <p className="text-[16px] text-[#78716C] leading-[1.6] mb-8 font-sans">
          All clear – every number adds up.
        </p>

        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-[#0F766E] hover:underline"
        >
          Check another bill
        </button>
      </div>
    );
  }

  // Calculate red ellipse coordinates from box_2d [ymin, xmin, ymax, xmax] 0-1000
  const { has: hasBox, cx, cy, rx, ry } = ellipseFromBox(currentFlagged.box_2d);

  // Computed facts for the flagged line
  const taxRate = audit.detectedTaxRate || 0;
  const taxOnLine = taxRate > 0 ? roundMoney(currentFlagged.amount * (taxRate / 100), audit.currency) : 0;
  const totalLineImpact = roundMoney(currentFlagged.amount + taxOnLine, audit.currency);
  const isMath = !!currentFlagged.isMathMismatch && currentFlagged.expectedAmount !== undefined;

  const renderBillContent = (inZoom = false) => {
    return (
      <div
        onClick={() => !inZoom && setIsZoomed(true)}
        className={`relative w-full rounded-[16px] overflow-hidden border border-[#EAE4DA] bg-white shadow-[0_2px_8px_rgba(28,25,23,0.04)] ${
          !inZoom ? 'cursor-pointer group' : ''
        }`}
      >
        {audit.billImageUrl ? (
          <img
            src={audit.billImageUrl}
            alt="Bill Statement"
            className="w-full h-auto block object-contain"
          />
        ) : (
          <div className="w-full h-80 flex flex-col items-center justify-center bg-white text-xs text-[#78716C] p-6 text-center">
            <span className="text-xs text-[#78716C] mb-3">We couldn't show a preview of this file on your device, but the check still ran.</span>
            <span className="font-serif text-2xl text-[#1C1917] mb-2">{audit.provider}</span>
            <span className="text-sm font-medium text-[#1C1917]">Reported total: {formatMoney(audit.reportedTotal)}</span>
            <span className="text-xs text-[#78716C] mt-1">{audit.period}</span>
          </div>
        )}

        {/* Red ellipse overlay: 3px stroke, no fill, slight padding */}
        {hasBox && audit.billImageUrl && (
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              stroke="#DC2626"
              strokeWidth="3"
              fill="none"
            />
          </svg>
        )}

        {!inZoom && audit.billImageUrl && (
          <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity flex items-center gap-1 text-[10px]">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Tap to zoom</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* 4) Check screen: desktop two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Bill Image with Red Circle Overlay */}
        <div className="lg:col-span-7">
          <div className="mb-2">
            {renderBillContent(false)}
            {audit.billImageUrl && (
              <p className="text-[11px] text-[#A8A29E] text-center mt-2 sm:hidden">
                Tap image to zoom
              </p>
            )}
          </div>
        </div>

        {/* Right Column: 'What we found' card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-[#EAE4DA] rounded-[16px] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.04)]">
            <span className="text-xs font-medium text-[#0F766E] block mb-1">
              What we found
            </span>

            <h3 className="text-lg font-medium text-[#1C1917] mb-1">
              {currentFlagged.label}
            </h3>

            {/* Large Amount in Serif */}
            <p className="font-serif text-4xl sm:text-5xl text-[#1C1917] tracking-tight mb-2">
              {formatMoney(currentFlagged.amount)}
            </p>

            {/* One-line reason */}
            <p className="text-sm text-[#78716C] mb-6 leading-relaxed">
              {getShortReason(currentFlagged)}
            </p>

            {/* Computed facts as 2-3 short rows */}
            <div className="border-t border-[#EAE4DA] pt-4 mb-6 space-y-2 text-xs text-[#78716C]">
              {isMath ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>Code says it should be:</span>
                    <span className="text-[#1C1917] font-medium">{formatMoney(currentFlagged.expectedAmount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{(currentFlagged.difference || 0) >= 0 ? 'Overcharged by:' : 'Undercharged by:'}</span>
                    <span className="text-[#DC2626] font-medium">{formatMoney(Math.abs(currentFlagged.difference || 0))}</span>
                  </div>
                </>
              ) : (
                <>
                  {taxRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Tax on it ({taxRate}%):</span>
                      <span className="text-[#1C1917] font-medium">{formatMoney(taxOnLine)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span>Total impact with tax:</span>
                    <span className="text-[#1C1917] font-medium">{formatMoney(totalLineImpact)}</span>
                  </div>
                </>
              )}

              {audit.gapVsUsual !== undefined && (
                <div className="flex items-center justify-between pt-1">
                  <span>Gap vs your usual bill:</span>
                  <span className="text-[#0F766E] font-medium">{audit.gapVsUsual >= 0 ? '+' : '−'}{formatMoney(Math.abs(audit.gapVsUsual))}</span>
                </div>
              )}
            </div>

            {/* Decision: 'Know this charge?' */}
            <div className="border-t border-[#EAE4DA] pt-5">
              <p className="text-sm font-medium text-[#1C1917] text-center mb-4">
                Know this charge?
              </p>

              <div className="space-y-3">
                {/* Teal 'No, ask them' button: fully rounded pill, 48px tall */}
                <button
                  type="button"
                  onClick={() => onProceedToMessage(currentFlagged)}
                  className="w-full h-[48px] bg-[#0F766E] hover:bg-[#115E59] text-white font-medium rounded-full text-sm transition-colors shadow-xs"
                >
                  No, ask them
                </button>

                {/* Outlined 'Yes, I know it' button: fully rounded pill, 48px tall */}
                <button
                  type="button"
                  onClick={() => onRecognizeCharge(currentFlagged.id)}
                  className="w-full h-[48px] bg-white border border-[#EAE4DA] hover:border-[#0F766E] text-[#1C1917] font-medium rounded-full text-sm transition-colors"
                >
                  Yes, I know it
                </button>
              </div>
            </div>

            {/* Small 'See the maths' link */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowMaths(!showMaths)}
                className="text-xs text-[#78716C] hover:text-[#0F766E] underline transition-colors"
              >
                {showMaths ? 'Hide full maths' : 'See the maths'}
              </button>
            </div>

            {showMaths && (
              <div className="mt-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] text-xs text-[#78716C] space-y-2">
                <div className="flex justify-between">
                  <span>Sum of line items:</span>
                  <span className="text-[#1C1917] font-medium">{formatMoney(audit.linesTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calculated tax ({taxRate}%):</span>
                  <span className="text-[#1C1917] font-medium">+{formatMoney(audit.computedTax)}</span>
                </div>
                <div className="flex justify-between border-t border-[#EAE4DA] pt-1.5 font-medium">
                  <span>Calculated total:</span>
                  <span className="text-[#1C1917]">{formatMoney(audit.computedTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bill stated total:</span>
                  <span className="text-[#1C1917]">{formatMoney(audit.reportedTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Lightbox Modal */}
      {isZoomed && audit.billImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-3"
          onClick={() => setIsZoomed(false)}
        >
          <div className="w-full max-w-2xl relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full max-h-[85vh] overflow-y-auto rounded-xl">
              {renderBillContent(true)}
            </div>
            <p className="text-xs text-white/70 text-center mt-3">
              {currentFlagged.label} – {formatMoney(currentFlagged.amount)} (circled in red)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
