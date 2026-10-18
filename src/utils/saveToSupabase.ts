import { AuditedBill, BillLine } from '../types/bill';

const USER_KEY = 'billshield_user_id';
const MAX_FILE_BASE64 = 3_000_000; // keep the request under Vercel's 4.5 MB body limit

function getAnonUserId(): string | undefined {
  try {
    let id = localStorage.getItem(USER_KEY);
    if (!id && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_KEY, id);
    }
    return id || undefined;
  } catch {
    return undefined;
  }
}

// Fire-and-forget: saving must never block or break the user's flow.
export async function saveCheckToSupabase(params: {
  audit: AuditedBill;
  file?: { data: string; mimeType: string; name: string } | null;
  disputedLine?: BillLine | null;
  draft?: string;
  finalMessage?: string;
  wordsChanged?: number;
}): Promise<void> {
  try {
    const { audit, file, disputedLine, draft, finalMessage, wordsChanged } = params;
    const lineIndex = disputedLine ? audit.lines.findIndex((l) => l.id === disputedLine.id) : -1;

    const body = {
      userId: getAnonUserId(),
      bill: {
        provider: audit.provider,
        period: audit.period,
        currency: audit.currency,
        total: audit.reportedTotal,
        usualAmount: audit.usualAmount,
      },
      lines: audit.lines.map((l) => ({
        label: l.label,
        amount: l.amount,
        status: l.status,
        isNew: !!l.isNewVsLastMonth,
        isVague: !!l.isVague,
        isMathMismatch: !!l.isMathMismatch,
        userRecognized: l.userRecognized,
      })),
      file: file && file.data.length <= MAX_FILE_BASE64 ? { data: file.data, mimeType: file.mimeType, name: file.name } : undefined,
      message:
        lineIndex >= 0 && finalMessage
          ? { lineIndex, draft, final: finalMessage, wordsChanged }
          : undefined,
    };

    const res = await fetch('/api/save-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    console.log('[BillShield] saved to Supabase:', json);
  } catch (err) {
    console.warn('[BillShield] Supabase save skipped:', err);
  }
}
