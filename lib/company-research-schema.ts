// JSON schema for the Feature 13 company research dossier. Fed through the
// same provider-agnostic lib/ai-extraction.ts abstraction Feature 07/10 use
// (extractStructuredData) — see context/build-plan.md's Feature 13 section
// for the field shapes this mirrors.

export type CompanyResearchDossier = {
  companyOverview: string;
  techStack: string[];
  culture: string[];
  whyThisRole: string;
  yourEdge: string[];
  gapsToAddress: string[];
  smartQuestions: string[];
  interviewPrep: string[];
  sources: string[];
};

export const COMPANY_RESEARCH_JSON_SCHEMA = {
  name: "company_research",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      companyOverview: { type: "string" },
      techStack: { type: "array", items: { type: "string" } },
      culture: { type: "array", items: { type: "string" } },
      whyThisRole: { type: "string" },
      yourEdge: { type: "array", items: { type: "string" } },
      gapsToAddress: { type: "array", items: { type: "string" } },
      smartQuestions: { type: "array", items: { type: "string" } },
      interviewPrep: { type: "array", items: { type: "string" } },
      sources: { type: "array", items: { type: "string" } },
    },
    required: [
      "companyOverview",
      "techStack",
      "culture",
      "whyThisRole",
      "yourEdge",
      "gapsToAddress",
      "smartQuestions",
      "interviewPrep",
      "sources",
    ],
  },
} as const;

export const COMPANY_RESEARCH_SYSTEM_PROMPT = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.
- If browser research is empty, still return a complete dossier inferred from the job posting and candidate profile alone — never leave a field empty or return partial JSON.
- Return only valid JSON matching the required schema.`;
