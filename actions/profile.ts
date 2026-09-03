"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import {
  Profile,
  ProfileFormData,
  calculateProfileCompletion,
} from "@/lib/profile-types";

export async function uploadResume(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const file = formData.get("resume") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return { success: false, error: "Only PDF files are allowed" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 5MB limit" };
    }

    const insforge = await createInsforgeServer();
    const objectKey = `${user.id}/resume.pdf`;

    const { data: storageData, error: storageError } = await insforge.storage
      .from("resumes")
      .upload(objectKey, file);

    if (storageError || !storageData?.url) {
      console.error("[actions/profile:uploadResume] storage error:", storageError);
      return {
        success: false,
        error: storageError?.message || "Failed to upload resume to storage",
      };
    }

    const resumeUrl = storageData.url;

    // Check if profile exists; update or insert
    const { data: existingRows } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id);

    const existing = (existingRows?.[0] as Profile) || null;

    if (!existing) {
      const completion = calculateProfileCompletion({
        id: user.id,
        email: user.email,
        resume_pdf_url: resumeUrl,
      });
      await insforge.database.from("profiles").insert([
        {
          id: user.id,
          email: user.email,
          resume_pdf_url: resumeUrl,
          is_complete: completion.isComplete,
        },
      ]);
    } else {
      const completion = calculateProfileCompletion({
        ...existing,
        resume_pdf_url: resumeUrl,
      });
      const { error: dbError } = await insforge.database
        .from("profiles")
        .update({
          resume_pdf_url: resumeUrl,
          is_complete: completion.isComplete,
        })
        .eq("id", user.id);

      if (dbError) {
        console.error("[actions/profile:uploadResume] db error:", dbError);
        return {
          success: false,
          error: "Failed to update profile with resume URL",
        };
      }
    }

    revalidatePath("/profile");
    return { success: true, url: resumeUrl };
  } catch (error) {
    console.error("[actions/profile:uploadResume]", error);
    return { success: false, error: "Failed to upload resume" };
  }
}

export async function saveProfile(formData: ProfileFormData): Promise<{
  success: boolean;
  error?: string;
  isComplete?: boolean;
  justCompleted?: boolean;
  completionPercent?: number;
}> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const insforge = await createInsforgeServer();

    // Fetch existing profile to preserve fields like resume_pdf_url
    const { data: existingRows } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id);

    const existingProfile = (existingRows?.[0] as Profile) || null;

    const candidateProfile: Partial<Profile> = {
      full_name: formData.fullName?.trim() || null,
      phone: formData.phone?.trim() || null,
      location: formData.location?.trim() || null,
      linkedin_url: formData.linkedinUrl?.trim() || null,
      portfolio_url: formData.portfolioUrl?.trim() || null,
      work_authorization: formData.workAuthorization || null,
      current_title: formData.jobTitle?.trim() || null,
      experience_level: formData.experienceLevel || null,
      years_experience:
        formData.yearsExperience !== undefined && formData.yearsExperience !== null
          ? Number(formData.yearsExperience)
          : null,
      skills: formData.skills || [],
      industries: formData.industries || [],
      work_experience: formData.workExperience || [],
      education: formData.education || null,
      job_titles_seeking: formData.jobTitlesSeeking || [],
      remote_preference: formData.remotePreference || null,
      salary_expectation: formData.salaryExpectation?.trim() || null,
      preferred_locations: formData.preferredLocations || [],
      cover_letter_tone: formData.coverLetterTone || "enthusiastic",
      resume_pdf_url: existingProfile?.resume_pdf_url || null,
    };

    const completion = calculateProfileCompletion(candidateProfile);

    const updatePayload = {
      ...candidateProfile,
      is_complete: completion.isComplete,
    };

    if (!existingProfile) {
      const { error: insertError } = await insforge.database
        .from("profiles")
        .insert([
          {
            id: user.id,
            email: user.email,
            ...updatePayload,
          },
        ]);
      if (insertError) {
        console.error("[actions/profile:saveProfile] db insert error:", insertError);
        return {
          success: false,
          error: insertError.message || "Failed to create profile",
        };
      }
    } else {
      const { error: updateError } = await insforge.database
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (updateError) {
        console.error("[actions/profile:saveProfile] db update error:", updateError);
        return {
          success: false,
          error: updateError.message || "Failed to save profile",
        };
      }
    }

    const wasAlreadyComplete = existingProfile?.is_complete ?? false;
    const isNowComplete = completion.isComplete;
    const justCompleted = !wasAlreadyComplete && isNowComplete;

    revalidatePath("/profile");
    return {
      success: true,
      isComplete: isNowComplete,
      justCompleted,
      completionPercent: completion.percentage,
    };
  } catch (error) {
    console.error("[actions/profile:saveProfile]", error);
    return { success: false, error: "Failed to save profile" };
  }
}
