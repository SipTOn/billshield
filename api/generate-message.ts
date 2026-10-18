import { GoogleGenAI } from '@google/genai';

// Vercel serverless function: POST /api/generate-message
// Gemini's ONLY job (b): write the message. Every number must come from code.

function validateMessageNumbers(message: string, allowed: number[]): boolean {
  const matches = message.match(/\b\d+(?:,\d{3})*(?:\.\d+)?\b/g) || [];
  for (const raw of matches) {
    const num = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(num)) continue;
    if (num >= 2024 && num <= 2030) continue; // years
    if (Number.isInteger(num) && num >= 1 && num <= 31) continue; // days
    if (!allowed.some((a) => Math.abs(a - num) < 0.05)) {
      console.warn(`Unverified number found in message: ${num}`);
      return false;
    }
  }
  return true;
}

function buildFallback(b: any): string {
  const { provider, period, status, lineLabel, lineAmount, total, currency = '₹', usualAmount, gapVsUsual } = b;
  if (status === 'wrong') {
    return `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} with a total of ${currency}${total}.\n\nUpon checking the line items, I noticed a discrepancy with "${lineLabel}" (${currency}${lineAmount}). The calculated total does not align with the stated charges. Could you please review this charge and apply the necessary correction to my account?\n\nThank you for your prompt assistance.`;
  }
  return `Dear ${provider} Team,\n\nI am writing regarding my bill for ${period || 'the current cycle'} totaling ${currency}${total}${
    gapVsUsual ? `, which is ${currency}${gapVsUsual} higher than my usual ${currency}${usualAmount}` : ''
  }.\n\nI noticed an unexplained line item "${lineLabel}" for ${currency}${lineAmount}. Could you please provide an itemized breakdown of what this charge covers?\n\nThank you for your assistance.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const fallback = buildFallback(body);

  try {
    const { provider, period, status, lineLabel, lineAmount, total, currency = '₹', usualAmount, gapVsUsual, taxRate = 18, facts } = body;

    const allowedNumbers: number[] = [
      total,
      lineAmount,
      taxRate,
      usualAmount,
      gapVsUsual,
      facts?.linesTotal,
      facts?.taxAmount,
      facts?.lineTaxImpact,
    ].filter((n): n is number => typeof n === 'number' && !isNaN(n));

    const systemPrompt = `You are a concise, polite customer communication assistant.
Write a short, professional inquiry message to the service provider.
CRITICAL RULES:
1. You may ONLY cite numbers that exist in this exact allowed list: [${allowedNumbers.join(', ')}].
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

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      config: { temperature: 0.2 },
    });

    const text = response.text?.trim() || '';
    if (text.length > 20 && validateMessageNumbers(text, allowedNumbers)) {
      return res.status(200).json({ success: true, message: text, source: 'ai_validated' });
    }
    return res.status(200).json({ success: true, message: fallback, source: 'code_template' });
  } catch (error: any) {
    console.error('Message generation error:', error);
    return res.status(200).json({ success: true, message: fallback, source: 'code_template' });
  }
}
