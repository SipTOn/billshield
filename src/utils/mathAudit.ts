import { BillData, BillLine, AuditedBill, RawBillLine } from '../types/bill';
import { normalizeCurrency, roundMoney, formatMoney } from './money';


// Rule A: Structural and summary line patterns that MUST NEVER be treated as charge line items
const STRUCTURAL_PATTERNS = [
  /sub\s*total/i,
  /\btotal\b/i,
  /amount\s+payable/i,
  /total\s+payable/i,
  /balance\s+payable/i,
  /total\s+amount/i,
  /net\s+payable/i,
  /net\s+amount/i,
  /amount\s+due/i,
  /current\s+charges/i,
  /\btax(?:es)?\b/i,
  /\bgst\b/i,
  /\bcgst\b/i,
  /\bsgst\b/i,
  /\bigst\b/i,
  /\butgst\b/i,
  /\bvat\b/i,
  /previous\s+balance/i,
  /opening\s+balance/i,
  /arrears/i,
  /payment(?:\s+received|s)?/i,
  /amount\s+paid/i,
  /last\s+payment/i,
  /discount/i,
  /waiver/i,
  /rebate/i,
  /credit(?:s)?\s+applied/i,
  /round\s*off/i,
  /rounding/i,
];

export function isStructuralLine(label: string): boolean {
  const trimmed = label.trim();
  return STRUCTURAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// Rule C: Exact vague label pattern list specified by user
// other charges, others, misc, miscellaneous, service fee, convenience fee, processing fee, adjustment, sundry, additional charges
const VAGUE_REGEX = /\b(other\s*charges?|others?|misc|miscellaneous|service\s*fees?|convenience\s*fees?|processing\s*fees?|adjustments?|sundry|additional\s*charges?)\b/i;

export function isVagueLabel(label: string): boolean {
  return VAGUE_REGEX.test(label.trim());
}

// Rule D: Plan / rental / subscription / recurring plan line pattern
const PLAN_REGEX = /\b(plan|rental|monthly|subscription|pack|add-?on|data|voice|broadband|unlimited|fixed)\b/i;

export function isPlanLine(label: string): boolean {
  return PLAN_REGEX.test(label.trim());
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Primary TypeScript math auditing engine.
 * Plain TypeScript only, never AI.
 */
export function auditBillData(
  bill: BillData,
  usualAmount?: number,
  lastMonthLines?: RawBillLine[]
): AuditedBill {
  // Rule A: Filter out all summary / structural lines so they never appear as charges
  const chargeLines: RawBillLine[] = [];
  let statedTaxFromLines = 0;

  for (const raw of bill.lines || []) {
    const label = raw.label ? raw.label.trim() : '';
    if (!label) continue;

    // Check if this is a tax line
    const isTax = /\b(gst|cgst|sgst|igst|utgst|vat|tax(?:es)?)\b/i.test(label);
    if (isTax) {
      statedTaxFromLines += raw.amount || 0;
      continue;
    }

    // Check if it's any other structural line (subtotal, total, payments, discounts)
    if (isStructuralLine(label)) {
      continue;
    }

    chargeLines.push(raw);
  }

  // 1. Plain TS sum of legitimate line items
  const currency = normalizeCurrency(bill.currency);
  const linesTotal = roundMoney(
    chargeLines.reduce((acc, line) => acc + (line.amount || 0), 0),
    currency
  );

  // 2. Tax: works for any country. No country's rate is assumed.
  const printedRate = bill.tax_rate && bill.tax_rate > 0 ? bill.tax_rate : 0;
  const statedTax =
    statedTaxFromLines > 0
      ? roundMoney(statedTaxFromLines, currency)
      : bill.tax_amount && bill.tax_amount > 0
        ? roundMoney(bill.tax_amount, currency)
        : 0;

  // Rate shown to the user: printed on the bill, else implied by the stated tax amount
  const taxRate = printedRate
    ? printedRate
    : statedTax > 0 && linesTotal > 0
      ? Math.round((statedTax / linesTotal) * 10000) / 100
      : 0;

  // Tax code expects: printed rate x taxable base, else whatever tax the bill states
  const computedTax = printedRate
    ? roundMoney(linesTotal * (printedRate / 100), currency)
    : statedTax;
  const taxUsedForTotal = statedTax > 0 ? statedTax : computedTax;
  const expectedTotal = roundMoney(linesTotal + taxUsedForTotal, currency);

  // Rule B: 'wrong' only when code proves a mismatch (small rounding tolerance)
  const tolerance = (base: number) => Math.max(0.05, Math.abs(base) * 0.002);
  const totalDifference = roundMoney(bill.total - expectedTotal, currency);
  const isTotalMismatch = Math.abs(totalDifference) > tolerance(expectedTotal);

  // Tax is only judged when the bill prints its rate AND states the tax amount
  const isTaxMismatch =
    printedRate > 0 && statedTax > 0 && Math.abs(statedTax - computedTax) > tolerance(computedTax);

  const isTotalValid = !isTotalMismatch;
  const isTaxValid = !isTaxMismatch;
  const isSumValid = linesTotal > 0;

  // Gap vs usual monthly amount (if provided)
  const gapVsUsual =
    usualAmount !== undefined && usualAmount > 0
      ? roundMoney(bill.total - usualAmount, currency)
      : undefined;

  // Rule C: If NO last month bill was uploaded, do NOT treat any line as new
  const hasLastMonthBill = Boolean(lastMonthLines && lastMonthLines.length > 0);
  const normalizedLastMonthLabels = hasLastMonthBill
    ? (lastMonthLines || []).map((l) =>
        l.label.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    : [];

  // Inspect each legitimate line item
  const auditedLines: BillLine[] = chargeLines.map((line, idx) => {
    const reasons: string[] = [];
    const isVague = isVagueLabel(line.label);
    const isPlan = isPlanLine(line.label);

    let isNewVsLastMonth = false;
    if (hasLastMonthBill) {
      const norm = line.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchFound = normalizedLastMonthLabels.some(
        (l) => l.includes(norm) || norm.includes(l)
      );
      if (!matchFound) {
        isNewVsLastMonth = true;
      }
    }

    // Status assignment:
    // Rule D: Plan / rental / recurring lines are 'ok' unless Rule B or last-month rule applies
    // Rule C: Line is 'unexplained' only if label is vague OR (last month was uploaded AND line is new)
    let status: BillLine['status'] = 'ok';

    if (isVague) {
      status = 'unexplained';
      reasons.push('Vague label, lacks transparent itemization');
    }

    if (isNewVsLastMonth) {
      status = 'unexplained';
      reasons.push('New charge not present on previous bill');
    }

    return {
      id: `line-${idx}-${line.label.slice(0, 10).replace(/\s+/g, '_')}`,
      label: line.label,
      amount: roundMoney(line.amount, currency),
      status,
      reasons,
      isNewVsLastMonth,
      isVague,
      isMathMismatch: false,
      userRecognized: false,
      box_2d: line.box_2d,
      page: line.page ?? 1,
    };
  });

  // If code proves the tax is wrong (printed rate x taxable base != tax charged), flag it
  if (isTaxMismatch) {
    auditedLines.push({
      id: 'math-mismatch-tax',
      label: `Tax charged (${printedRate}%)`,
      amount: statedTax,
      status: 'wrong',
      reasons: [
        `Tax charged is ${formatMoney(statedTax, currency)}, but ${printedRate}% of ${formatMoney(
          linesTotal,
          currency
        )} is ${formatMoney(computedTax, currency)}`,
      ],
      isMathMismatch: true,
      userRecognized: false,
      page: 1,
    });
  }

  // If code proves a mathematical mismatch (Rule B), add a flagged discrepancy line
  if (isTotalMismatch) {
    auditedLines.push({
      id: 'math-mismatch-total',
      label: 'Statement Calculation Discrepancy',
      amount: Math.abs(totalDifference),
      status: 'wrong',
      reasons: [
        `Bill total differs from sum of charges and tax by ${formatMoney(
          Math.abs(totalDifference),
          currency
        )}`,
      ],
      isMathMismatch: true,
      userRecognized: false,
      page: 1,
    });
  }

  // Filter ONLY flagged lines ('unexplained' or 'wrong')
  const flaggedLines = auditedLines.filter((l) => l.status !== 'ok');

  const result: AuditedBill = {
    provider: bill.provider || 'Service Provider',
    period: bill.period || 'Current Billing Cycle',
    dueDate: bill.due_date || 'Due upon receipt',
    currency,
    reportedTotal: bill.total,
    linesTotal,
    detectedTaxRate: taxRate,
    computedTax,
    computedTotal: expectedTotal,
    isSumValid,
    isTaxValid,
    isTotalValid,
    usualAmount,
    gapVsUsual,
    lines: auditedLines,
    flaggedLines,
    billImageUrl: bill.billImageUrl,
    auditStatus: flaggedLines.length > 0 ? 'flagged' : 'clean',
  };

  // Rule E: Log the audit result to the console for debugging
  console.log('BillShield Audit Result:', {
    provider: result.provider,
    reportedTotal: result.reportedTotal,
    linesTotal: result.linesTotal,
    taxRate: result.detectedTaxRate,
    computedTax: result.computedTax,
    computedTotal: result.computedTotal,
    isTotalValid: result.isTotalValid,
    chargeLinesCount: chargeLines.length,
    flaggedCount: flaggedLines.length,
    flaggedLines: flaggedLines.map((f) => ({
      label: f.label,
      amount: f.amount,
      status: f.status,
      reasons: f.reasons,
      box_2d: f.box_2d,
    })),
  });

  return result;
}
