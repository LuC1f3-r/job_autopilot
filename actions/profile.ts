"use server";

import { revalidatePath } from "next/cache";
import { PDFParse } from "pdf-parse";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { ensurePdfWorkerConfigured } from "@/lib/pdf-worker-setup";
import {
  Profile,
  ProfileFormData,
  calculateProfileCompletion,
} from "@/lib/profile-types";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { isOpenRouterConfigured } from "@/lib/openrouter";
import { extractStructuredData, NoAiProviderConfiguredError } from "@/lib/ai-extraction";
import {
  ExtractedProfileData,
  RESUME_EXTRACTION_JSON_SCHEMA,
  RESUME_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/resume-extraction-schema";

const MIN_EXTRACTABLE_TEXT_LENGTH = 50;

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

export async function extractProfileFromResume(): Promise<{
  success: boolean;
  data?: ExtractedProfileData;
  error?: string;
}> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!isAnthropicConfigured() && !isOpenRouterConfigured()) {
      return {
        success: false,
        error: "AI extraction is not configured yet. Please try again later.",
      };
    }

    const insforge = await createInsforgeServer();

    const { data: existingRows } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id);
    const existing = (existingRows?.[0] as Profile) || null;

    if (!existing?.resume_pdf_url) {
      return { success: false, error: "Upload a resume before extracting." };
    }

    const { data: blob, error: downloadError } = await insforge.storage
      .from("resumes")
      .download(`${user.id}/resume.pdf`);

    if (downloadError || !blob) {
      console.error(
        "[actions/profile:extractProfileFromResume] storage download error:",
        downloadError
      );
      return { success: false, error: "Could not load your uploaded resume." };
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    let extractedText = "";
    ensurePdfWorkerConfigured();
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      extractedText = result.text?.trim() || "";
    } catch (parseError) {
      console.error(
        "[actions/profile:extractProfileFromResume] pdf-parse error:",
        parseError
      );
      return {
        success: false,
        error: "Could not extract text from this PDF. Please try a different file.",
      };
    } finally {
      await parser.destroy();
    }

    if (extractedText.length < MIN_EXTRACTABLE_TEXT_LENGTH) {
      return {
        success: false,
        error: "Could not extract text from this PDF. Please try a different file.",
      };
    }

    let extracted: ExtractedProfileData;
    try {
      extracted = await extractStructuredData<ExtractedProfileData>(
        extractedText,
        RESUME_EXTRACTION_JSON_SCHEMA,
        RESUME_EXTRACTION_SYSTEM_PROMPT
      );
    } catch (aiError) {
      if (aiError instanceof NoAiProviderConfiguredError) {
        return {
          success: false,
          error: "AI extraction is not configured yet. Please try again later.",
        };
      }
      console.error(
        "[actions/profile:extractProfileFromResume] AI extraction error:",
        aiError
      );
      return {
        success: false,
        error:
          "Something went wrong while extracting your resume. Please try again or fill the form manually.",
      };
    }

    return { success: true, data: extracted };
  } catch (error) {
    console.error("[actions/profile:extractProfileFromResume]", error);
    return {
      success: false,
      error:
        "Something went wrong while extracting your resume. Please try again or fill the form manually.",
    };
  }
}
