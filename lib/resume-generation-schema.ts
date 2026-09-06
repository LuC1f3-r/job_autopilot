// JSON schema for AI-polished resume content, generated from an existing
// profile rather than extracted from one. Per Feature 08's build-plan spec,
// output follows the Harvard OCS bullet-point convention shown in
// public/2025-template_bullet.docx: action-verb-led, quantified where
// possible, no personal pronouns, phrase rather than full sentence.
//
// Only the fields the AI needs to polish are covered here — everything else
// in ResumePdfDocument.tsx (name, contact info, education) is read straight
// from the profile, untouched by the model. workExperience entries must map
// 1:1 to the profile's existing work_experience array in the same order —
// the AI rephrases each role, it never adds or removes one.

export type GeneratedWorkExperienceItem = {
  companyName: string;
  jobTitle: string;
  location: string;
  dateRange: string;
  bullets: string[];
};

export type GeneratedResumeContent = {
  workExperience: GeneratedWorkExperienceItem[];
  skillsSummary: string[];
};

export const RESUME_GENERATION_JSON_SCHEMA = {
  name: "resume_generation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      workExperience: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            companyName: { type: "string" },
            jobTitle: { type: "string" },
            location: { type: "string" },
            dateRange: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["companyName", "jobTitle", "location", "dateRange", "bullets"],
        },
      },
      skillsSummary: { type: "array", items: { type: "string" } },
    },
    required: ["workExperience", "skillsSummary"],
  },
};

export const RESUME_GENERATION_SYSTEM_PROMPT = `You are a professional resume writer rewriting a candidate's existing profile data into polished resume bullets, following the Harvard OCS resume convention.

Rules:
- Only rephrase and tighten facts already given. Never invent employers, dates, titles, or skills, and never change what a role or company actually was.
- Rewrite each role's raw responsibilities into 2-4 bullet points: begin each with a strong action verb, quantify outcomes where the source text supports it, and phrase each as a fragment — never a full sentence, never using "I" or other personal pronouns.
- workExperience entries must appear in the exact same order as the input roles, one output entry per input role — do not merge, split, add, or drop roles.
- location and dateRange should carry through the input values for that role as given (reformat lightly for consistency, e.g. "Jan 2022 - Present", but do not alter what they say).
- skillsSummary should be the candidate's skills list, deduplicated and ordered with the most role-relevant skills first — do not add skills not present in the input.
- If a role's responsibilities are empty or too thin to produce a meaningful bullet, write at most one concise bullet from the job title and company context alone rather than fabricating detail.`;
