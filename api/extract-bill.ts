import { GoogleGenAI, Type } from '@google/genai';

// Vercel serverless function: POST /api/extract-bill
// Gemini's ONLY job (a): read the bill into JSON. No personal identifiers.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData, mimeType } = req.body || {};
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: 'Missing fileData or mimeType' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const prompt = `You are a financial bill data reader. Extract the bill information into JSON format.
STRICT PRIVACY RULES:
- NEVER extract or include customer name, phone number, account number, statement number, customer ID, address, email, card numbers, or UPI IDs.
- Extract ONLY the high-level invoice metadata and the financial line items.
- Bills can be from any country and in any currency. Keep amounts exactly as printed (do not convert currency).
- The 'lines' array must ONLY contain individual service, product, and usage charge line items before tax.
- DO NOT include summary or structural lines in 'lines' (such as Subtotal, Total, Total Amount Payable, GST, CGST, SGST, IGST, VAT, Tax lines, Previous Balance, Payments Received, or Rounding off). Put those into the top-level 'total' and 'tax_rate' fields instead.
- For each charge line item, detect its visual bounding box coordinates on the document 'box_2d': [ymin, xmin, ymax, xmax] normalised from 0 to 1000 (where 0 is top/left, 1000 is bottom/right), and 'page' (integer page number, starting from 1).

Format your output strictly according to this JSON structure:
{
"provider": string,
"period": string,
"due_date": string,
"currency": string (ISO 4217 code of the currency printed on the bill, e.g. INR, BHD, AED, SAR, USD, GBP, EUR),
"total": number (final amount payable),
"tax_rate": number (the tax percentage ONLY if printed on the bill, e.g. 18 for GST 18%, 10 for VAT 10%; 0 if not printed. Never guess by country),
"tax_amount": number (total tax amount printed on the bill: GST/CGST+SGST/IGST/VAT/sales tax combined; 0 if none),
"taxable_amount": number (the amount the tax was charged on, ONLY if printed on the bill, e.g. "Taxable amount" / "VATable amount"; 0 if not printed),
"tax_box_2d": [ymin, xmin, ymax, xmax] (bounding box of the main tax line on the bill, normalised 0-1000; omit if no tax line),
"lines": [ { "label": string, "amount": number, "box_2d": [ymin, xmin, ymax, xmax], "page": integer } ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ inlineData: { mimeType, data: fileData } }, { text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            provider: { type: Type.STRING },
            period: { type: Type.STRING },
            due_date: { type: Type.STRING },
            currency: { type: Type.STRING },
            total: { type: Type.NUMBER },
            tax_rate: { type: Type.NUMBER },
            tax_amount: { type: Type.NUMBER },
            taxable_amount: { type: Type.NUMBER },
            tax_box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  page: { type: Type.INTEGER },
                },
                required: ['label', 'amount'],
              },
            },
          },
          required: ['provider', 'total', 'lines'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to extract bill data' });
  }
}
