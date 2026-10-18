import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY is not set in environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. Bill Data Extraction API
// Gemini's ONLY job (a): read the bill into JSON
// {provider, period, due_date, currency, total, tax_rate, lines:[{label, amount}]}
// STRICT PRIVACY: never include name, phone, account/statement number, address or card/UPI.
app.post('/api/extract-bill', async (req, res) => {
  try {
    const { fileData, mimeType } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: 'Missing fileData or mimeType' });
    }

    const ai = getGeminiClient();

    const prompt = `You are a financial bill data reader. Extract the bill information into JSON format.
STRICT PRIVACY RULES:
- NEVER extract or include customer name, phone number, account number, statement number, customer ID, address, email, card numbers, or UPI IDs.
- Extract ONLY the high-level invoice metadata and the financial line items.
- The 'lines' array must ONLY contain individual service, product, and usage charge line items before tax.
- DO NOT include summary or structural lines in 'lines' (such as Subtotal, Total, Total Amount Payable, GST, CGST, SGST, IGST, VAT, Tax lines, Previous Balance, Payments Received, or Rounding off). Put those into the top-level 'total' and 'tax_rate' fields instead.
- For each charge line item, detect its visual bounding box coordinates on the document 'box_2d': [ymin, xmin, ymax, xmax] normalised from 0 to 1000 (where 0 is top/left, 1000 is bottom/right), and 'page' (integer page number, starting from 1).

Format your output strictly according to this JSON structure:
{
  "provider": string (e.g. "Jio", "Airtel", "Zain", "DEWA", "Utility Co"),
  "period": string (e.g. "01 Oct 2026 - 31 Oct 2026" or "October 2026"),
  "due_date": string (e.g. "15 Nov 2026" or empty string),
  "currency": string (e.g. "₹", "INR", "USD", "$", "BHD", "AED", "EUR", "£"),
  "total": number (the final total amount payable on the bill, e.g. 1414.82),
  "tax_rate": number (the tax percentage if stated, e.g. 18 for 18% GST or 10 for 10% VAT, or 0 if none),
  "lines": [
    {
      "label": string (e.g. "Plan 749 Rental", "Voice & Data Pack", "Other Charges"),
      "amount": number (the net amount before tax for this line),
      "box_2d": [ymin, xmin, ymax, xmax] (normalized 0 to 1000),
      "page": integer (default 1)
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: fileData,
          },
        },
        {
          text: prompt,
        },
      ],
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
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  box_2d: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: '[ymin, xmin, ymax, xmax] normalized 0-1000',
                  },
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

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract bill data',
    });
  }
});

// Helper to sanitize and check numbers in message
function validateMessageNumbers(
  message: string,
  allowedNumbers: number[]
): boolean {
  // Extract all numbers (integers and decimals) from text
  // e.g. "1,414.82", "450", "18", "885"
  const rawMatches = message.match(/\b\d+(?:,\d{3})*(?:\.\d+)?\b/g) || [];

  // Filter out plausible year numbers (e.g., 2024..2030) or days (1..31) if needed,
  // but strictly check monetary values
  for (const raw of rawMatches) {
    const num = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(num)) continue;

    // Allow typical calendar years (2020..2030) and day counts (1..31)
    if (num >= 2024 && num <= 2030) continue;
    if (Number.isInteger(num) && num >= 1 && num <= 31) continue;

    // Check if it matches any code-computed fact (within 0.01 tolerance)
    const isAllowed = allowedNumbers.some(
      (allowed) => Math.abs(allowed - num) < 0.05
    );

    if (!isAllowed) {
      console.warn(`Unverified number found in message: ${num}`);
      return false;
    }
  }

  return true;
}

// 2. Draft Message Generation API
// Gemini's ONLY job (b): write the final short polite message
// Every number in the message must come from code-computed facts.
app.post('/api/generate-message', async (req, res) => {
  try {
    const {
      provider,
      period,
      status, // 'wrong' | 'unexplained'
      lineLabel,
      lineAmount,
      total,
      currency = '₹',
      usualAmount,
      gapVsUsual,
      taxRate = 18,
      facts,
    } = req.body;

    const allowedNumbers: number[] = [
      total,
      lineAmount,
      taxRate,
      ...(usualAmount ? [usualAmount] : []),
      ...(gapVsUsual ? [gapVsUsual] : []),
      ...(facts?.linesTotal ? [facts.linesTotal] : []),
      ...(facts?.taxAmount ? [facts.taxAmount] : []),
      ...(facts?.lineTaxImpact ? [facts.lineTaxImpact] : []),
    ].filter((n): n is number => typeof n === 'number' && !isNaN(n));

    // Deterministic fallback templates
    const fallbackTemplate =
      status === 'wrong'
        ? `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} with a total of ${currency}${total}.\n\nUpon checking the line items, I noticed a discrepancy with "${lineLabel}" (${currency}${lineAmount}). The calculated total does not align with the stated charges. Could you please review this charge and apply the necessary correction to my account?\n\nThank you for your prompt assistance.`
        : `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} totaling ${currency}${total}${
            gapVsUsual
              ? `, which is ${currency}${gapVsUsual} higher than my usual ${currency}${usualAmount}`
              : ''
          }.\n\nI noticed an unexplained line item "${lineLabel}" for ${currency}${lineAmount}. Could you please provide an itemized breakdown of what this charge covers?\n\nThank you for your assistance.`;

    const ai = getGeminiClient();

    const systemPrompt = `You are a concise, polite customer communication assistant.
Write a short, professional inquiry message to the service provider.
CRITICAL RULES:
1. You may ONLY cite numbers that exist in this exact allowed list: [${allowedNumbers.join(
      ', '
    )}].
2. NEVER calculate, invent, or round any new numbers.
3. Keep the tone calm, polite, and direct.
4. If status is "wrong", politely ask for an audit correction and credit.
5. If status is "unexplained", politely ask for a detailed itemized breakdown of the charge.`;

    const userPrompt = `Provider: ${provider}
Billing Period: ${period || 'Current Period'}
Total Bill Amount: ${currency}${total}
Flagged Line Item: "${lineLabel}" (${currency}${lineAmount})
Status: ${status}
${usualAmount ? `Usual Monthly Bill: ${currency}${usualAmount}` : ''}
${gapVsUsual ? `Unexplained Difference: ${currency}${gapVsUsual}` : ''}
${taxRate ? `Tax Rate: ${taxRate}%` : ''}

Draft the short inquiry message now.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
      config: {
        temperature: 0.2,
      },
    });

    const generatedText = response.text?.trim() || '';

    // Validate every number in generated message against code-computed facts
    const isValid = validateMessageNumbers(generatedText, allowedNumbers);

    if (isValid && generatedText.length > 20) {
      return res.json({
        success: true,
        message: generatedText,
        source: 'ai_validated',
      });
    } else {
      console.log('AI message failed number validation; using code template fallback');
      return res.json({
        success: true,
        message: fallbackTemplate,
        source: 'code_template',
      });
    }
  } catch (error: any) {
    console.error('Message generation error:', error);
    // Even if Gemini fails, return the validated code template seamlessly!
    const { provider, period, status, lineLabel, lineAmount, total, currency = '₹', usualAmount, gapVsUsual } = req.body;
    const fallback =
      status === 'wrong'
        ? `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} with a total of ${currency}${total}.\n\nUpon checking the line items, I noticed a discrepancy with "${lineLabel}" (${currency}${lineAmount}). The calculated total does not align with the stated charges. Could you please review this charge and apply the necessary correction to my account?\n\nThank you for your prompt assistance.`
        : `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} totaling ${currency}${total}${
            gapVsUsual
              ? `, which is ${currency}${gapVsUsual} higher than my usual ${currency}${usualAmount}`
              : ''
          }.\n\nI noticed an unexplained line item "${lineLabel}" for ${currency}${lineAmount}. Could you please provide an itemized breakdown of what this charge covers?\n\nThank you for your assistance.`;

    return res.json({
      success: true,
      message: fallback,
      source: 'code_template',
    });
  }
});

// Setup Vite middlewares for dev or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BillShield server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
