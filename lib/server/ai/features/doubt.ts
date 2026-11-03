import 'server-only';
import { getQuestion } from '@/lib/content';
import { applyPatch, localize, type QuestionPatch } from '@/lib/question-text';
import type { FeatureHandler } from './types';

/** How the doubt solver behaves. Written for any model, so it stays the same when the model changes. */
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

const LETTERS = ['A', 'B', 'C', 'D'];

/** `lang` is the language the student reads questions in (the English / Hinglish switch). */
type Input = { messages: { role: 'user' | 'assistant'; content: string }[]; questionId?: string; lang?: 'en' | 'hi' };

/** The AI Doubt Solver: a tutor chat, optionally about one practice question from the site. */
export const doubt: FeatureHandler<{ answer: string }> = {
  async prepare(body, { limits, admin }) {
    const input = (body ?? {}) as Partial<Input>;
    const messages = (Array.isArray(input.messages) ? input.messages : [])
      .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.trim() }));

    const last = messages.at(-1);
    if (!last || last.role !== 'user') return { error: 'Type your doubt first.' };
    if (last.content.length > limits.maxInputChars) return { error: `Keep your doubt under ${limits.maxInputChars} characters.` };

    // Recent history only, each message capped, so long chats don't blow up the prompt.
    const history = messages.slice(-(limits.historyMessages + 1)).map((m) => ({ ...m, content: m.content.slice(0, limits.maxInputChars) }));

    // The question is looked up on the server (with any admin correction), never taken from the browser.
    let system = SYSTEM_PROMPT;
    const english = input.lang !== 'hi';
    if (typeof input.questionId === 'string') {
      const original = getQuestion(input.questionId);
      if (original) {
        const { data } = await admin.from('content_overrides').select('data').eq('key', `q:${original.id}`).maybeSingle();
        const q = localize(applyPatch(original, data?.data as QuestionPatch | undefined), english ? 'en' : 'hi');
        system += [
          `\n\nThe student is asking about this practice question from the site, which they read in ${english ? 'English' : 'Hinglish'}:`,
          `Question: ${q.question}`,
          q.code ? `Code:\n${q.code}` : '',
          `Options: ${q.options.map((o, i) => `${LETTERS[i]}) ${o}`).join('  ')}`,
          `Correct answer: ${LETTERS[q.answer]}`,
          `Explanation on the site: ${q.explanation}`,
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    if (english) system += '\n\nThe student reads questions on the site in English, so reply in simple English unless they write to you in Hinglish.';
    return { system, messages: history };
  },

  respond: (result) => ({ answer: result.text }),
};
