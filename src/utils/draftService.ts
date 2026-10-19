import { AuditedBill, BillLine } from '../types/bill';
import { roundMoney } from './money';

// Starts writing the message early (while the user is still deciding on the Check screen)
// and reuses the result, so the Message screen usually opens with the draft ready.
const cache = new Map<string, Promise<string | null>>();

function buildBody(audit: AuditedBill, line: BillLine) {
  return {
    provider: audit.provider,
    period: audit.period,
    status: line.status,
    lineLabel: line.label,
    lineAmount: line.amount,
    total: audit.reportedTotal,
    currency: audit.currency,
    usualAmount: audit.usualAmount,
    gapVsUsual: audit.gapVsUsual,
    taxRate: audit.detectedTaxRate,
    facts: {
      linesTotal: audit.linesTotal,
      taxAmount: audit.computedTax,
      lineTaxImpact: line.isMathMismatch
        ? undefined
        : audit.detectedTaxRate
          ? roundMoney((line.amount * (100 + audit.detectedTaxRate)) / 100, audit.currency)
          : line.amount,
      expectedAmount: line.expectedAmount,
      difference: line.difference !== undefined ? Math.abs(line.difference) : undefined,
    },
  };
}

export function getDraft(audit: AuditedBill, line: BillLine): Promise<string | null> {
  const body = buildBody(audit, line);
  const key = JSON.stringify(body);
  let p = cache.get(key);
  if (!p) {
    p = fetch('/api/generate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && typeof d.message === 'string' ? d.message : null))
      .catch(() => null);
    p.then((m) => {
      if (!m) cache.delete(key); // allow a retry if it failed
    });
    cache.set(key, p);
  }
  return p;
}

export const prefetchDraft = (audit: AuditedBill, line: BillLine) => {
  void getDraft(audit, line);
};
