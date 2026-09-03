"use client";

import { useState, useEffect, FormEvent } from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { FormButton } from "@/components/ui/form-button";
import { saveProfile } from "@/actions/profile";
import type { Profile, WorkExperienceItem, ProfileFormData } from "@/lib/profile-types";

// Stored values are the lowercase snake_case enums documented in
// context/architecture.md's `profiles` schema — labels are for display only.
const WORK_AUTHORIZATION_OPTIONS = [
  { label: "Citizen", value: "citizen" },
  { label: "Permanent Resident", value: "permanent_resident" },
  { label: "Visa Sponsorship Required", value: "visa_required" },
  { label: "Other", value: "other" },
];
const EXPERIENCE_LEVEL_OPTIONS = [
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
];
const DEGREE_OPTIONS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const REMOTE_PREFERENCE_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];
const COVER_LETTER_TONE_OPTIONS = [
  { label: "Enthusiastic", value: "enthusiastic" },
  { label: "Formal", value: "formal" },
  { label: "Casual", value: "casual" },
];

const MAX_WORK_EXPERIENCE_ROLES = 3;

type Props = {
  email: string;
  initialData?: Profile | null;
};

export function ProfileForm({ email, initialData }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [skills, setSkills] = useState<string[]>(initialData?.skills ?? []);

  const [industries, setIndustries] = useState<string[]>(initialData?.industries ?? []);

  const [roles, setRoles] = useState<WorkExperienceItem[]>(
    initialData?.work_experience ?? []
  );

  function addRole() {
    if (roles.length >= MAX_WORK_EXPERIENCE_ROLES) return;
    setRoles([
      ...roles,
      {
        id: crypto.randomUUID(),
        companyName: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        currentlyWorking: false,
        responsibilities: "",
      },
    ]);
  }

  function removeRole(id: string) {
    setRoles((prev) => prev.filter((role) => role.id !== id));
  }

  function updateRole(id: string, patch: Partial<WorkExperienceItem>) {
    setRoles((prev) => prev.map((role) => (role.id === id ? { ...role, ...patch } : role)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    setToast(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const jobTitlesSeekingRaw = (formData.get("jobTitlesSeeking") as string) || "";
    const preferredLocationsRaw = (formData.get("preferredLocations") as string) || "";

    const payload: ProfileFormData = {
      fullName: (formData.get("fullName") as string) || "",
      phone: (formData.get("phone") as string) || "",
      location: (formData.get("location") as string) || "",
      linkedinUrl: (formData.get("linkedinUrl") as string) || "",
      portfolioUrl: (formData.get("portfolioUrl") as string) || "",
      workAuthorization: (formData.get("workAuthorization") as string) || "citizen",
      jobTitle: (formData.get("jobTitle") as string) || "",
      experienceLevel: (formData.get("experienceLevel") as string) || "mid",
      yearsExperience: Number(formData.get("yearsExperience")) || 0,
      skills,
      industries,
      workExperience: roles,
      education: {
        highestDegree: (formData.get("highestDegree") as string) || "",
        fieldOfStudy: (formData.get("fieldOfStudy") as string) || "",
        institutionName: (formData.get("institutionName") as string) || "",
        graduationYear: (formData.get("graduationYear") as string) || "",
      },
      jobTitlesSeeking: jobTitlesSeekingRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      remotePreference: (formData.get("remotePreference") as string) || "any",
      salaryExpectation: (formData.get("salaryExpectation") as string) || "",
      preferredLocations: preferredLocationsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      coverLetterTone: (formData.get("coverLetterTone") as string) || "enthusiastic",
    };

    try {
      const result = await saveProfile(payload);
      if (result.success) {
        setStatusMessage({
          type: "success",
          text: "Profile saved successfully.",
        });

        setToast({
          type: "success",
          title: "Profile saved",
          message: "Your profile information has been saved successfully.",
        });

        if (result.justCompleted) {
          posthog.capture("profile_completed");
        }
      } else {
        const errorText = result.error || "Failed to save profile. Please try again.";
        setStatusMessage({
          type: "error",
          text: errorText,
        });
        setToast({
          type: "error",
          title: "Error saving profile",
          message: errorText,
        });
      }
    } catch (err) {
      console.error("Save profile error:", err);
      const errText = "An unexpected error occurred while saving.";
      setStatusMessage({
        type: "error",
        text: errText,
      });
      setToast({
        type: "error",
        title: "Error saving profile",
        message: errText,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Profile Information</h2>
            <p className="mt-1 text-sm text-text-secondary">
              This context is used to accurately represent you in agent interactions.
            </p>
          </div>
          {statusMessage && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                statusMessage.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div className="mt-6 border-t border-border-light pt-6">
          <h3 className="text-sm font-semibold text-text-primary">Personal Info</h3>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Input
              label="Full Name"
              name="fullName"
              defaultValue={initialData?.full_name ?? ""}
            />
            <Input label="Email" name="email" value={email} disabled />
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1 (555) 000-0000"
              defaultValue={initialData?.phone ?? ""}
            />
            <Input
              label="Location"
              name="location"
              placeholder="City, Country"
              defaultValue={initialData?.location ?? ""}
            />
            <Input
              label="LinkedIn URL"
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/..."
              defaultValue={initialData?.linkedin_url ?? ""}
            />
            <Input
              label="Portfolio / GitHub"
              name="portfolioUrl"
              placeholder="https://github.com/..."
              defaultValue={initialData?.portfolio_url ?? ""}
            />
            <Select
              label="Work Authorization"
              name="workAuthorization"
              options={WORK_AUTHORIZATION_OPTIONS}
              defaultValue={initialData?.work_authorization ?? "citizen"}
            />
          </div>
        </div>

        {/* Professional Info */}
        <div className="mt-6 border-t border-border-light pt-6">
          <h3 className="text-sm font-semibold text-text-primary">Professional Info</h3>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Current/Recent Job Title"
                name="jobTitle"
                defaultValue={initialData?.current_title ?? ""}
              />
            </div>
            <Select
              label="Experience Level"
              name="experienceLevel"
              options={EXPERIENCE_LEVEL_OPTIONS}
              defaultValue={initialData?.experience_level ?? "mid"}
            />
            <Input
              label="Years of Experience"
              name="yearsExperience"
              type="number"
              min={0}
              defaultValue={initialData?.years_experience ?? 0}
            />
            <div className="md:col-span-2">
              <TagInput
                label="Skills"
                placeholder="Add a skill and press Enter"
                tags={skills}
                onChange={setSkills}
              />
            </div>
            <div className="md:col-span-2">
              <TagInput
                label="Industries Worked In (optional)"
                placeholder="E.g. FinTech, Healthcare"
                tags={industries}
                onChange={setIndustries}
              />
            </div>
          </div>
        </div>

        {/* Work Experience */}
        <div className="mt-6 border-t border-border-light pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Work Experience</h3>
              <p className="text-xs text-text-muted">Add up to 3 most relevant roles.</p>
            </div>
            <button
              type="button"
              onClick={addRole}
              disabled={roles.length >= MAX_WORK_EXPERIENCE_ROLES}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add role
            </button>
          </div>

          <div className="mt-4 space-y-6">
            {roles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-muted p-6 text-center text-xs text-text-muted">
                No work experience added yet. Click &quot;Add role&quot; above to include your experience.
              </div>
            ) : (
              roles.map((role, index) => (
                <div
                  key={role.id}
                  className={index > 0 ? "border-t border-border-light pt-6" : ""}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Role #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRole(role.id)}
                      className="inline-flex items-center gap-1 text-xs text-error hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <Input
                      label="Company Name"
                      value={role.companyName}
                      onChange={(e) => updateRole(role.id, { companyName: e.target.value })}
                    />
                    <Input
                      label="Job Title"
                      value={role.jobTitle}
                      onChange={(e) => updateRole(role.id, { jobTitle: e.target.value })}
                    />
                    <Input
                      label="Start Date"
                      type="month"
                      value={role.startDate}
                      onChange={(e) => updateRole(role.id, { startDate: e.target.value })}
                    />
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-xs font-medium tracking-wide text-text-secondary uppercase">
                          End Date
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                          <input
                            type="checkbox"
                            checked={role.currentlyWorking}
                            onChange={(e) =>
                              updateRole(role.id, {
                                currentlyWorking: e.target.checked,
                                endDate: e.target.checked ? "" : role.endDate,
                              })
                            }
                            className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
                          />
                          Currently working here
                        </label>
                      </div>
                      <input
                        type="month"
                        disabled={role.currentlyWorking}
                        value={role.endDate}
                        onChange={(e) => updateRole(role.id, { endDate: e.target.value })}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea
                        label="Key Responsibilities"
                        value={role.responsibilities}
                        onChange={(e) =>
                          updateRole(role.id, { responsibilities: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Education */}
        <div className="mt-6 border-t border-border-light pt-6">
          <h3 className="text-sm font-semibold text-text-primary">Education</h3>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Select
              label="Highest Degree"
              name="highestDegree"
              options={DEGREE_OPTIONS}
              defaultValue={initialData?.education?.highestDegree ?? "Bachelor's"}
            />
            <Input
              label="Field of Study"
              name="fieldOfStudy"
              defaultValue={initialData?.education?.fieldOfStudy ?? ""}
            />
            <Input
              label="Institution Name"
              name="institutionName"
              placeholder="E.g. State University"
              defaultValue={initialData?.education?.institutionName ?? ""}
            />
            <Input
              label="Graduation Year"
              name="graduationYear"
              placeholder="YYYY"
              defaultValue={initialData?.education?.graduationYear ?? ""}
            />
          </div>
        </div>

        {/* Job Preferences */}
        <div className="mt-6 border-t border-border-light pt-6">
          <h3 className="text-sm font-semibold text-text-primary">Job Preferences</h3>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Job Titles Seeking (comma separated)"
                name="jobTitlesSeeking"
                placeholder="E.g. Frontend Engineer, React Developer"
                defaultValue={initialData?.job_titles_seeking?.join(", ") ?? ""}
              />
            </div>
            <Select
              label="Remote Preference"
              name="remotePreference"
              options={REMOTE_PREFERENCE_OPTIONS}
              defaultValue={initialData?.remote_preference ?? "any"}
            />
            <Select
              label="Cover Letter Tone"
              name="coverLetterTone"
              options={COVER_LETTER_TONE_OPTIONS}
              defaultValue={initialData?.cover_letter_tone ?? "enthusiastic"}
            />
            <Input
              label="Salary Expectation (optional)"
              name="salaryExpectation"
              placeholder="E.g. $120k+"
              defaultValue={initialData?.salary_expectation ?? ""}
            />
            <div className="md:col-span-2">
              <Input
                label="Preferred Locations (optional, comma separated)"
                name="preferredLocations"
                placeholder="E.g. New York, London"
                defaultValue={initialData?.preferred_locations?.join(", ") ?? ""}
              />
            </div>
          </div>
        </div>

        {/* Bottom Status / Confirmation Message */}
        {statusMessage && (
          <div
            className={`mt-6 flex items-center justify-between rounded-xl border p-4 text-sm ${
              statusMessage.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-error/30 bg-error/10 text-error"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <FormButton
          type="submit"
          variant="primary"
          disabled={isSaving}
          className="mt-6 w-full justify-center py-3 text-base"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            "Save Profile"
          )}
        </FormButton>
      </form>

      {/* Floating Confirmation Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl shadow-black/10 transition-all animate-in fade-in slide-in-from-bottom-5"
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              toast.type === "success"
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
            <p className="text-xs text-text-secondary">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="cursor-pointer text-text-muted hover:text-text-primary"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
