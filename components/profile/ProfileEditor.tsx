"use client";

import { useState } from "react";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MAX_WORK_EXPERIENCE_ROLES, type Profile } from "@/lib/profile-types";
import type { ExtractedProfileData } from "@/lib/resume-extraction-schema";

type Props = {
  email: string;
  initialData: Profile | null;
};

// Client wrapper owning the bridge between ResumeUpload (which triggers
// extraction) and ProfileForm (which needs to reflect extracted data).
// ProfileForm's fields are largely uncontrolled (defaultValue + FormData on
// submit) — remounting it with a fresh key + merged initialData is the
// smallest way to make "Extract from Resume" populate the form.
export function ProfileEditor({ email, initialData }: Props) {
  const [profileData, setProfileData] = useState<Profile | null>(initialData);
  const [formKey, setFormKey] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  function applyExtracted(extracted: ExtractedProfileData) {
    setProfileData((prev) => ({
      ...(prev ?? ({} as Profile)),
      id: prev?.id ?? "",
      email: prev?.email ?? email,
      full_name: extracted.fullName || prev?.full_name || null,
      phone: extracted.phone || prev?.phone || null,
      location: extracted.location || prev?.location || null,
      linkedin_url: extracted.linkedinUrl || prev?.linkedin_url || null,
      portfolio_url: extracted.portfolioUrl || prev?.portfolio_url || null,
      current_title: extracted.jobTitle || prev?.current_title || null,
      experience_level: extracted.experienceLevel || prev?.experience_level || null,
      years_experience:
        typeof extracted.yearsExperience === "number"
          ? extracted.yearsExperience
          : prev?.years_experience ?? null,
      skills: extracted.skills?.length ? extracted.skills : prev?.skills ?? null,
      industries: extracted.industries?.length ? extracted.industries : prev?.industries ?? null,
      work_experience: extracted.workExperience?.length
        ? extracted.workExperience.slice(0, MAX_WORK_EXPERIENCE_ROLES).map((role) => ({
            id: crypto.randomUUID(),
            ...role,
          }))
        : prev?.work_experience ?? null,
      education:
        extracted.education &&
        (extracted.education.institutionName || extracted.education.highestDegree)
          ? extracted.education
          : prev?.education ?? null,
      is_complete: prev?.is_complete ?? false,
      created_at: prev?.created_at ?? "",
      updated_at: prev?.updated_at ?? "",
    }));
    // Remount ProfileForm so its uncontrolled inputs re-read defaultValue.
    setFormKey((k) => k + 1);
    setIsDirty(false);
  }

  function handleExtracted(extracted: ExtractedProfileData) {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes in the profile form. Extracting from your resume will overwrite them. Continue?"
      );
      if (!confirmed) return;
    }
    applyExtracted(extracted);
  }

  function handleUploaded(url: string) {
    setProfileData((prev) =>
      prev
        ? { ...prev, resume_pdf_url: url }
        : {
            id: "",
            email,
            full_name: null,
            phone: null,
            location: null,
            current_title: null,
            experience_level: null,
            years_experience: null,
            skills: null,
            industries: null,
            work_experience: null,
            education: null,
            job_titles_seeking: null,
            remote_preference: null,
            preferred_locations: null,
            salary_expectation: null,
            cover_letter_tone: null,
            linkedin_url: null,
            portfolio_url: null,
            work_authorization: null,
            resume_pdf_url: url,
            is_complete: false,
            created_at: "",
            updated_at: "",
          }
    );
  }

  return (
    <>
      <ResumeUpload
        currentResumeUrl={profileData?.resume_pdf_url}
        onExtracted={handleExtracted}
        onUploaded={handleUploaded}
      />
      <ProfileForm
        key={formKey}
        email={email}
        initialData={profileData}
        onDirtyChange={setIsDirty}
      />
    </>
  );
}
