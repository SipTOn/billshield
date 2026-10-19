// Currency helpers: work for any country, not just India.
// The AI reads the currency printed on the bill; code turns it into an ISO code and formats it.

const SYMBOL_TO_ISO: Record<string, string> = {
  '₹': 'INR', 'RS': 'INR', 'RS.': 'INR', 'RUPEES': 'INR',
  '$': 'USD', 'US$': 'USD', 'USD$': 'USD',
  '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₩': 'KRW', '₱': 'PHP', '฿': 'THB',
  'BD': 'BHD', 'BD.': 'BHD', 'د.ب': 'BHD',
  'DHS': 'AED', 'DH': 'AED', 'د.إ': 'AED',
  'SR': 'SAR', 'ر.س': 'SAR',
  'QR': 'QAR', 'ر.ق': 'QAR',
  'KD': 'KWD', 'د.ك': 'KWD',
  'RO': 'OMR', 'ر.ع.': 'OMR',
  'S$': 'SGD', 'A$': 'AUD', 'C$': 'CAD', 'NZ$': 'NZD', 'HK$': 'HKD',
  '৳': 'BDT', 'RM': 'MYR', 'RP': 'IDR', 'R': 'ZAR', 'KSH': 'KES', '₦': 'NGN',
};

export function normalizeCurrency(raw?: string): string {
  const c = (raw || '').trim();
  if (!c) return 'INR';
  const upper = c.toUpperCase();
  if (SYMBOL_TO_ISO[c]) return SYMBOL_TO_ISO[c];
  if (SYMBOL_TO_ISO[upper]) return SYMBOL_TO_ISO[upper];
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return c; // unknown symbol: keep as printed
}

function isIsoCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

// Number of decimals the currency uses (e.g. INR/USD 2, BHD/KWD/OMR 3, JPY 0)
export function currencyDecimals(currency: string): number {
  const code = normalizeCurrency(currency);
  if (!isIsoCode(code)) return 2;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: code })
      .resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function roundMoney(amount: number, currency: string): number {
  const f = Math.pow(10, currencyDecimals(currency));
  return Math.round((amount + Number.EPSILON) * f) / f;
}

export function formatMoney(amount: number, currency: string): string {
  const code = normalizeCurrency(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  if (isIsoCode(code)) {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      }).format(value);
    } catch {
      /* fall through */
    }
  }
  return `${code} ${value.toFixed(2)}`;
}
