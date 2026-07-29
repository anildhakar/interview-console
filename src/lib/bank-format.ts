import { z } from "zod";

export const questionImportSchema = z.object({
  category: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
  qtype: z.enum([
    "theory",
    "practical",
    "situational",
    "architectural",
    "debugging",
  ]),
  question: z.string().min(1).max(4000),
  answer_hints: z.string().max(4000).optional().nullable(),
  follow_ups: z.array(z.string().max(1000)).max(20).optional().nullable(),
});

export const bankImportSchema = z.object({
  bank: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(1000).optional().nullable(),
  }),
  questions: z.array(questionImportSchema).min(1).max(2000),
});

export type BankImport = z.infer<typeof bankImportSchema>;
export type QuestionImport = z.infer<typeof questionImportSchema>;

/** The downloadable, AI-agent-facing template. */
export const BANK_TEMPLATE = {
  $instructions: {
    purpose:
      "Fill this file with interview questions for the Interview Console. You are an AI agent generating a question bank. Replace the example questions below with your own. Keep this exact JSON shape.",
    format: "JSON. Do not output CSV, markdown, or comments — only valid JSON.",
    fields: {
      "bank.name":
        "A unique, human-readable name for this bank, e.g. 'Node.js Backend' or 'System Design'. Importing a bank whose name already exists lets the user merge into it.",
      "bank.description": "One sentence describing what this bank covers. Optional.",
      "questions[].category":
        "Free-form topic grouping used for the accordion, e.g. 'Hooks', 'CSS Layout', 'Networking'. Reuse the same string for related questions so they group together.",
      "questions[].difficulty": "One of: easy | medium | hard.",
      "questions[].qtype":
        "One of: theory | practical | situational | architectural | debugging.",
      "questions[].question": "The interview question itself. Be specific.",
      "questions[].answer_hints":
        "A concise cheat-sheet for the interviewer: key points a strong answer should hit. Not shown to the candidate. Optional but strongly recommended.",
      "questions[].follow_ups":
        "An array of short follow-up prompts the interviewer can use to go deeper. Optional.",
    },
    guidance: [
      "Aim for a spread across difficulty (easy/medium/hard) and qtype (theory/practical/situational/architectural/debugging).",
      "Write answer_hints as terse bullet-like phrases, not full paragraphs.",
      "Prefer questions that reveal reasoning over trivia.",
      "A good bank has 30-150 questions.",
    ],
  },
  bank: {
    name: "Example Bank — rename me",
    description: "Replace with a one-line description of this bank.",
  },
  questions: [
    {
      category: "Fundamentals",
      difficulty: "easy",
      qtype: "theory",
      question: "What problem does this technology primarily solve?",
      answer_hints:
        "Looks for a clear, correct one-line explanation and a real use case.",
      follow_ups: ["When would you NOT use it?"],
    },
    {
      category: "Fundamentals",
      difficulty: "medium",
      qtype: "practical",
      question:
        "Walk me through how you would implement <a common task> from scratch.",
      answer_hints:
        "Correct approach, edge cases considered, clean structure, mentions testing.",
      follow_ups: ["How would you handle failures?", "How would you test it?"],
    },
    {
      category: "Architecture",
      difficulty: "hard",
      qtype: "architectural",
      question:
        "Design a system that must scale to <N> users with <constraint>. What are the trade-offs?",
      answer_hints:
        "Identifies bottlenecks, proposes caching/scaling strategy, discusses trade-offs explicitly.",
      follow_ups: ["Where does this design break first under load?"],
    },
    {
      category: "Debugging",
      difficulty: "medium",
      qtype: "debugging",
      question:
        "A user reports <symptom>. The logs show <clue>. How do you investigate?",
      answer_hints:
        "Systematic approach: reproduce, isolate, form hypothesis, verify. Doesn't jump to conclusions.",
      follow_ups: [],
    },
  ],
};

export function normalizeFollowUps(followUps: string[] | null | undefined): string | null {
  if (!followUps || followUps.length === 0) return null;
  return JSON.stringify(followUps);
}
