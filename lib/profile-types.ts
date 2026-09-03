export type WorkExperienceItem = {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string;
};

export type EducationDetails = {
  highestDegree: string;
  fieldOfStudy: string;
  institutionName: string;
  graduationYear: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: string | null;
  years_experience: number | null;
  skills: string[] | null;
  industries: string[] | null;
  work_experience: WorkExperienceItem[] | null;
  education: EducationDetails | null;
  job_titles_seeking: string[] | null;
  remote_preference: string | null;
  preferred_locations: string[] | null;
  salary_expectation: string | null;
  cover_letter_tone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: string | null;
  resume_pdf_url: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileFormData = {
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  workAuthorization: string;
  jobTitle: string;
  experienceLevel: string;
  yearsExperience: number;
  skills: string[];
  industries: string[];
  workExperience: WorkExperienceItem[];
  education: EducationDetails;
  jobTitlesSeeking: string[];
  remotePreference: string;
  salaryExpectation: string;
  preferredLocations: string[];
  coverLetterTone?: string;
};

export type ProfileCompletionResult = {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
};

export function calculateProfileCompletion(
  profile: Partial<Profile> | null | undefined
): ProfileCompletionResult {
  if (!profile) {
    return {
      percentage: 0,
      isComplete: false,
      missingFields: [
        "Full Name",
        "Phone",
        "Location",
        "Job Title",
        "Experience Level",
        "Years of Experience",
        "Skills",
        "Work Experience",
        "Education",
        "Target Roles",
        "Resume",
      ],
    };
  }

  const checks: { label: string; pass: boolean }[] = [
    { label: "Full Name", pass: Boolean(profile.full_name?.trim()) },
    { label: "Phone", pass: Boolean(profile.phone?.trim()) },
    { label: "Location", pass: Boolean(profile.location?.trim()) },
    { label: "Job Title", pass: Boolean(profile.current_title?.trim()) },
    { label: "Experience Level", pass: Boolean(profile.experience_level?.trim()) },
    {
      label: "Years of Experience",
      pass: typeof profile.years_experience === "number" && profile.years_experience >= 0,
    },
    {
      label: "Skills",
      pass: Array.isArray(profile.skills) && profile.skills.length > 0,
    },
    {
      label: "Work Experience",
      pass:
        Array.isArray(profile.work_experience) &&
        profile.work_experience.some(
          (role) => Boolean(role.companyName?.trim()) && Boolean(role.jobTitle?.trim())
        ),
    },
    {
      label: "Education",
      pass:
        Boolean(profile.education?.institutionName?.trim()) &&
        Boolean(profile.education?.highestDegree?.trim()),
    },
    {
      label: "Target Roles",
      pass:
        Array.isArray(profile.job_titles_seeking) &&
        profile.job_titles_seeking.length > 0,
    },
    {
      label: "Resume",
      pass: Boolean(profile.resume_pdf_url?.trim()),
    },
  ];

  const missingFields = checks.filter((c) => !c.pass).map((c) => c.label);
  const passedCount = checks.length - missingFields.length;
  const percentage = Math.round((passedCount / checks.length) * 100);
  const isComplete = missingFields.length === 0;

  return {
    percentage,
    isComplete,
    missingFields,
  };
}
