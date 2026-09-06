import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { Profile } from "@/lib/profile-types";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { isOpenRouterConfigured } from "@/lib/openrouter";
import { extractStructuredData, NoAiProviderConfiguredError } from "@/lib/ai-extraction";
import {
  GeneratedResumeContent,
  RESUME_GENERATION_JSON_SCHEMA,
  RESUME_GENERATION_SYSTEM_PROMPT,
} from "@/lib/resume-generation-schema";
import { ResumePdfDocument } from "@/components/resume/ResumePdfDocument";

// Kept outside POST() (rather than inline in its try/catch) purely to keep
// JSX construction out of a function that also has a try/catch in it — the
// lint rule against that is aimed at React DOM rendering inside an error
// boundary, which doesn't apply here (renderToBuffer, not React DOM, is
// what does the actual rendering and error-throwing, and POST's try/catch
// around that call does correctly catch it).
function buildResumeDocument(profile: Profile, content: GeneratedResumeContent) {
  return <ResumePdfDocument profile={profile} content={content} />;
}

// POST /api/resume/generate — reads the current profile, has the AI polish
// its work-experience bullets and skills into resume prose (never inventing
// facts), renders that into a PDF following public/2025-template_bullet.docx's
// layout, and uploads it to the same resumes/{user_id}/resume.pdf key
// Feature 06's manual upload uses. This intentionally overwrites whatever
// PDF currently lives at that key — one active resume per user, same
// convention as the upload path.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isAnthropicConfigured() && !isOpenRouterConfigured()) {
      return NextResponse.json(
        { error: "AI generation is not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    const insforge = await createInsforgeServer();

    const { data: existingRows } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id);
    const profile = (existingRows?.[0] as Profile) || null;

    if (!profile || !profile.is_complete) {
      return NextResponse.json(
        { error: "Complete your profile before generating a resume." },
        { status: 400 }
      );
    }

    if (
      !profile.full_name ||
      !profile.current_title ||
      !profile.work_experience ||
      profile.work_experience.length === 0
    ) {
      return NextResponse.json(
        { error: "Add your name, title, and work experience before generating a resume." },
        { status: 400 }
      );
    }

    const hadExistingResume = Boolean(profile.resume_pdf_url);

    const userPrompt = JSON.stringify({
      fullName: profile.full_name,
      currentTitle: profile.current_title,
      yearsExperience: profile.years_experience,
      skills: profile.skills,
      industries: profile.industries,
      workExperience: profile.work_experience,
      education: profile.education,
    });

    let content: GeneratedResumeContent;
    try {
      content = await extractStructuredData<GeneratedResumeContent>(
        userPrompt,
        RESUME_GENERATION_JSON_SCHEMA,
        RESUME_GENERATION_SYSTEM_PROMPT
      );
    } catch (aiError) {
      if (aiError instanceof NoAiProviderConfiguredError) {
        return NextResponse.json(
          { error: "AI generation is not configured yet. Please try again later." },
          { status: 503 }
        );
      }
      console.error("[api/resume/generate] AI generation error:", aiError);
      return NextResponse.json(
        { error: "Something went wrong while generating your resume. Please try again." },
        { status: 500 }
      );
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderToBuffer(buildResumeDocument(profile, content));
    } catch (renderError) {
      console.error("[api/resume/generate] PDF render error:", renderError);
      return NextResponse.json(
        { error: "Failed to generate the resume PDF. Please try again." },
        { status: 500 }
      );
    }

    const objectKey = `${user.id}/resume.pdf`;
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });

    const { data: storageData, error: storageError } = await insforge.storage
      .from("resumes")
      .upload(objectKey, pdfBlob);

    if (storageError || !storageData?.url) {
      console.error("[api/resume/generate] storage error:", storageError);
      return NextResponse.json(
        { error: storageError?.message || "Failed to save the generated resume." },
        { status: 500 }
      );
    }

    const { error: dbError } = await insforge.database
      .from("profiles")
      .update({ resume_pdf_url: storageData.url })
      .eq("id", user.id);

    if (dbError) {
      console.error("[api/resume/generate] db update error:", dbError);
      return NextResponse.json(
        { error: "Resume generated but failed to save the link. Please try again." },
        { status: 500 }
      );
    }

    revalidatePath("/profile");

    return NextResponse.json({
      success: true,
      url: storageData.url,
      hadExistingResume,
    });
  } catch (error) {
    console.error("[api/resume/generate] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to generate resume" }, { status: 500 });
  }
}
