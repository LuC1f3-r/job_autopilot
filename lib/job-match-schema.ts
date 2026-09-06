// JSON schema for scoring a single Adzuna job result against the current
// user's profile. Fed through the same provider-agnostic
// lib/ai-extraction.ts abstraction Feature 07 uses (extractStructuredData) —
// see context/library-docs.md's "OpenAI GPT-4o" section for the field
// shapes this mirrors.

export type JobMatchResult = {
  matchScore: number; // 0-100
  matchReason: string; // one paragraph explanation
  matchedSkills: string[]; // skills the user has that the job requires
  missingSkills: string[]; // skills the job requires that the user lacks
};

export const JOB_MATCH_JSON_SCHEMA = {
  name: "job_match",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      matchScore: { type: "integer", minimum: 0, maximum: 100 },
      matchReason: { type: "string" },
      matchedSkills: { type: "array", items: { type: "string" } },
      missingSkills: { type: "array", items: { type: "string" } },
    },
    required: ["matchScore", "matchReason", "matchedSkills", "missingSkills"],
  },
} as const;

export const JOB_MATCH_SYSTEM_PROMPT = `You are a job matching assistant for a job-search app. You are given a candidate's profile and a single job posting. Score how well this candidate matches this job.

Rules:
- matchScore is an integer 0-100 reflecting overall fit between the candidate's skills/experience and the job's stated requirements.
- matchReason is one concise paragraph explaining the score — ground it only in the candidate's actual profile and the job posting text, never invent skills or requirements not present in either.
- matchedSkills lists skills the candidate's profile shows they have that the job also requires or mentions.
- missingSkills lists skills the job requires or mentions that the candidate's profile does not show.
- The job description provided is a short snippet, not the full posting — score based on what's actually there, don't assume unstated requirements.
- Return only valid JSON matching the required schema.`;
