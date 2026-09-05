// JSON schema for the subset of ProfileFormData that GPT-4o can reliably
// derive from resume text. Preference-only fields (jobTitlesSeeking,
// remotePreference, salaryExpectation, preferredLocations, coverLetterTone,
// workAuthorization) are intentionally excluded — a resume can't express
// them, so extraction leaves those to the user.
//
// Field names match ProfileFormData (camelCase, form-facing) per Feature 07's
// build-plan spec: "structured JSON matching all profile field names."

export type ExtractedWorkExperienceItem = {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string;
};

export type ExtractedEducation = {
  highestDegree: string;
  fieldOfStudy: string;
  institutionName: string;
  graduationYear: string;
};

export type ExtractedProfileData = {
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  jobTitle: string;
  experienceLevel: string;
  yearsExperience: number;
  skills: string[];
  industries: string[];
  workExperience: ExtractedWorkExperienceItem[];
  education: ExtractedEducation;
};

// Stored enum values must match the lowercase snake_case documented in
// context/architecture.md (see ProfileForm.tsx's option arrays).
const EXPERIENCE_LEVEL_ENUM = ["junior", "mid", "senior", "lead"] as const;

export const RESUME_EXTRACTION_JSON_SCHEMA = {
  name: "resume_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      fullName: { type: "string" },
      phone: { type: "string" },
      location: { type: "string" },
      linkedinUrl: { type: "string" },
      portfolioUrl: { type: "string" },
      jobTitle: { type: "string" },
      experienceLevel: { type: "string", enum: [...EXPERIENCE_LEVEL_ENUM] },
      yearsExperience: { type: "integer" },
      skills: { type: "array", items: { type: "string" } },
      industries: { type: "array", items: { type: "string" } },
      workExperience: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            companyName: { type: "string" },
            jobTitle: { type: "string" },
            startDate: { type: "string", description: "YYYY-MM format" },
            endDate: { type: "string", description: "YYYY-MM format, empty if current" },
            currentlyWorking: { type: "boolean" },
            responsibilities: { type: "string" },
          },
          required: [
            "companyName",
            "jobTitle",
            "startDate",
            "endDate",
            "currentlyWorking",
            "responsibilities",
          ],
        },
      },
      education: {
        type: "object",
        additionalProperties: false,
        properties: {
          highestDegree: { type: "string" },
          fieldOfStudy: { type: "string" },
          institutionName: { type: "string" },
          graduationYear: { type: "string" },
        },
        required: ["highestDegree", "fieldOfStudy", "institutionName", "graduationYear"],
      },
    },
    required: [
      "fullName",
      "phone",
      "location",
      "linkedinUrl",
      "portfolioUrl",
      "jobTitle",
      "experienceLevel",
      "yearsExperience",
      "skills",
      "industries",
      "workExperience",
      "education",
    ],
  },
} as const;

// Counts how many top-level fields the extraction actually populated.
// education is always a present object (schema requires it), so it only
// counts as populated when at least one of its own values is non-empty;
// workExperience is an array of objects, counted by length like the other
// arrays.
export function countPopulatedFields(data: ExtractedProfileData): number {
  return Object.entries(data).filter(([key, value]) => {
    if (key === "education") {
      return Object.values(value as ExtractedEducation).some((v) => Boolean(v));
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    // yearsExperience: 0 is a legitimately extracted value (entry-level
    // candidates), not an empty field — Boolean(0) would wrongly exclude it.
    if (typeof value === "number") {
      return true;
    }
    return Boolean(value);
  }).length;
}

export const RESUME_EXTRACTION_SYSTEM_PROMPT = `You extract structured profile data from resume text for a job-search assistant app.

Rules:
- Only extract facts stated or clearly implied in the resume text. Never invent employers, dates, or skills.
- experienceLevel must be one of: junior, mid, senior, lead — infer from years of experience and seniority of titles (junior: 0-2 years, mid: 3-5 years, senior: 6-9 years, lead: 10+ years or explicit lead/manager/director titles).
- yearsExperience is your best-effort estimate of total professional experience in whole years, based on employment date ranges.
- workExperience should include at most the 3 most recent/relevant roles, most recent first. Dates in YYYY-MM format where possible; leave endDate empty and currentlyWorking true for the current role.
- Leave any field empty ("" for strings, [] for arrays) if it cannot be determined from the text — do not guess.`;
