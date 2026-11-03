import 'server-only';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are the NEXT GEN doubt solver, a patient tutor for IIT Madras BS (Data Science) Foundation students: Maths I/II, Statistics I/II, Computational Thinking, Python, English I/II.

How to answer:
- Reply in simple Hinglish (Hindi in Roman script mixed with English); keep technical terms in English. If the student writes in English, answer in English.
- Start with a one-line direct answer, then explain step by step with numbered steps. Use a small worked example when it helps.
- Show every calculation. Double-check arithmetic before answering.
- Formatting: short paragraphs, **bold** for key terms, \`inline code\` and fenced code blocks for code, simple "- " or "1. " lists. Write maths in plain Unicode (x², √, ≤, Σ, μ, σ). Never use tables, LaTeX, HTML or headings.
- Keep answers under about 250 words unless the student asks for more detail.
- If the doubt is about a graded assignment, OPPE or exam happening right now, teach the concept with a different example instead of giving the final answer.
- Only help with studies. Politely decline anything else.
- Never claim to be affiliated with IIT Madras.`;

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** One answer from Gemini for the conversation so far. Throws on API errors. */
export async function askGemini(turns: ChatTurn[], context?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const system = context ? `${SYSTEM_PROMPT}\n\nThe student is asking about this practice question from the site:\n${context}` : SYSTEM_PROMPT;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty answer');
  return text;
}
