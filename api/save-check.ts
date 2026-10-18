// Vercel serverless function: POST /api/save-check
// Saves one checked bill to Supabase: users -> expected -> bills -> line_items -> messages.
// Rows for facts, files for bytes: the bill file goes to the private 'bills' Storage bucket,
// and bills.file_url keeps its path. No names, phone or account numbers are ever sent here.

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { apikey: SUPABASE_KEY };
  // Legacy service_role keys are JWTs and also go in Authorization.
  if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function insertRows(table: string, rows: any[], upsert = false): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Prefer: upsert
        ? 'return=representation,resolution=ignore-duplicates'
        : 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`Insert into ${table} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function uploadFile(path: string, base64: string, mimeType: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/bills/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': mimeType, 'x-upsert': 'true' },
    body: Buffer.from(base64, 'base64'),
  });
  if (!res.ok) console.warn('Bill file upload failed:', res.status, await res.text());
  return res.ok;
}

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(200).json({ saved: false, reason: 'Supabase not configured' });
  }

  try {
    const { userId, bill, lines = [], file, message } = req.body || {};
    if (!bill || !Array.isArray(lines)) return res.status(400).json({ error: 'Missing bill or lines' });

    // 1. users (anonymous id kept in the browser; no personal details)
    let uid: string | null = null;
    if (typeof userId === 'string' && UUID_RE.test(userId)) {
      await insertRows('users', [{ id: userId }], true);
      uid = userId;
    }

    // 2. expected (optional usual amount)
    let expectedId: string | null = null;
    if (typeof bill.usualAmount === 'number' && !isNaN(bill.usualAmount)) {
      const [exp] = await insertRows('expected', [
        { user_id: uid, provider: bill.provider || null, usual_amount: bill.usualAmount },
      ]);
      expectedId = exp?.id ?? null;
    }

    // 3. bills
    const fileType = file?.mimeType ? EXT[file.mimeType] || file.mimeType : null;
    const [billRow] = await insertRows('bills', [
      {
        user_id: uid,
        expected_id: expectedId,
        provider: bill.provider || null,
        bill_type: bill.billType || null,
        period_label: bill.period || null,
        total: typeof bill.total === 'number' ? bill.total : null,
        currency: bill.currency || null,
        file_type: fileType,
      },
    ]);

    // Bill file -> Storage, link kept on the bills row
    if (file?.data && file?.mimeType) {
      const path = `${billRow.id}.${EXT[file.mimeType] || 'bin'}`;
      if (await uploadFile(path, file.data, file.mimeType)) {
        await fetch(`${SUPABASE_URL}/rest/v1/bills?id=eq.${billRow.id}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: `bills/${path}` }),
        });
      }
    }

    // 4. line_items
    const lineRows = await insertRows(
      'line_items',
      lines.map((l: any) => ({
        bill_id: billRow.id,
        label: String(l.label || '').slice(0, 300),
        amount: Number(l.amount) || 0,
        kind: l.isMathMismatch ? 'math_mismatch' : l.isVague ? 'vague_label' : 'charge',
        is_new: !!l.isNew,
        user_recognised: typeof l.userRecognized === 'boolean' ? l.userRecognized : null,
        status: l.userRecognized ? 'explained' : ['ok', 'wrong', 'unexplained'].includes(l.status) ? l.status : 'ok',
      }))
    );

    // 5. messages -> the line it disputes (THE PROOF LINK)
    let messageId: string | null = null;
    if (message && typeof message.lineIndex === 'number' && lineRows[message.lineIndex]) {
      const [msg] = await insertRows('messages', [
        {
          line_item_id: lineRows[message.lineIndex].id,
          draft_text: message.draft || null,
          final_text: message.final || null,
          words_changed: typeof message.wordsChanged === 'number' ? message.wordsChanged : null,
          sent_at: new Date().toISOString(),
        },
      ]);
      messageId = msg?.id ?? null;
    }

    return res.status(200).json({ saved: true, billId: billRow.id, messageId });
  } catch (error: any) {
    console.error('save-check error:', error);
    return res.status(500).json({ saved: false, error: error?.message || 'Save failed' });
  }
}
