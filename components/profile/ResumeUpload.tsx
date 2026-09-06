"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { FormButton } from "@/components/ui/form-button";
import { uploadResume, deleteResume, extractProfileFromResume } from "@/actions/profile";
import { countPopulatedFields, type ExtractedProfileData } from "@/lib/resume-extraction-schema";

type Props = {
  currentResumeUrl?: string | null;
  isProfileComplete?: boolean;
  onExtracted?: (data: ExtractedProfileData) => void;
  onUploaded?: (url: string) => void;
  onGenerated?: (url: string) => void;
  onDeleted?: () => void;
};

export function ResumeUpload({
  currentResumeUrl,
  isProfileComplete = false,
  onExtracted,
  onUploaded,
  onGenerated,
  onDeleted,
}: Props) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const resumeUrl = uploadedUrl || currentResumeUrl || null;
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await uploadResume(formData);
      if (res.success && res.url) {
        setUploadedUrl(res.url);
        onUploaded?.(res.url);
      } else {
        setErrorMessage(res.error || "Failed to upload resume.");
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      setErrorMessage("An unexpected error occurred while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleGenerate = async () => {
    setGenerateError(null);

    if (resumeUrl) {
      const confirmed = window.confirm(
        "Generating a new resume will replace your current resume file. Continue?"
      );
      if (!confirmed) return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/resume/generate", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setUploadedUrl(data.url);
        onGenerated?.(data.url);
        posthog.capture("resume_generated", {
          hadExistingResume: Boolean(data.hadExistingResume),
        });
      } else {
        setGenerateError(data.error || "Failed to generate resume.");
      }
    } catch (err) {
      console.error("Resume generation error:", err);
      setGenerateError("An unexpected error occurred while generating your resume.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtract = async () => {
    setExtractError(null);
    setIsExtracting(true);
    try {
      const res = await extractProfileFromResume();
      if (res.success && res.data) {
        onExtracted?.(res.data);
        posthog.capture("resume_extracted", {
          fieldsPopulated: countPopulatedFields(res.data),
        });
      } else {
        setExtractError(res.error || "Failed to extract profile from resume.");
      }
    } catch (err) {
      console.error("Resume extraction error:", err);
      setExtractError("An unexpected error occurred while extracting your resume.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to remove your resume? This will delete the file from storage."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteResume();
      if (res.success) {
        setUploadedUrl(null);
        onDeleted?.();
      } else {
        setErrorMessage(res.error || "Failed to remove resume.");
      }
    } catch (err) {
      console.error("Resume delete error:", err);
      setErrorMessage("An unexpected error occurred while deleting resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Resume</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Upload an existing resume to auto-fill the profile, or generate a new tailored one from
            your details below.
          </p>
        </div>
        {resumeUrl && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resume Uploaded
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {resumeUrl ? (
        <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-border-light bg-surface-secondary p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-accent shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">resume.pdf</p>
              <a
                href="/api/resume/view"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                View uploaded resume <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FormButton
              variant="primary"
              disabled={isUploading || isExtracting || isDeleting}
              icon={isExtracting ? undefined : <Sparkles className="h-4 w-4" />}
              onClick={handleExtract}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract from Resume"
              )}
            </FormButton>
            <FormButton
              variant="secondary"
              disabled={isUploading || isExtracting || isDeleting}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Replace Resume"
              )}
            </FormButton>
            <button
              type="button"
              title="Remove resume"
              aria-label="Remove resume"
              disabled={isUploading || isExtracting || isDeleting}
              onClick={handleDelete}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error focus:outline-none focus:ring-2 focus:ring-error/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin text-error" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
            isDragging
              ? "border-accent bg-accent/5"
              : "border-border-muted bg-surface-secondary hover:border-accent/50"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent shadow-sm">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {isUploading ? "Uploading resume..." : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-text-muted">PDF formatting only. Maximum file size 5MB.</p>
          <FormButton
            variant="secondary"
            className="mt-1"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Select Resume"
            )}
          </FormButton>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {extractError && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{extractError}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-border-light pt-4">
        <p className="text-sm text-text-secondary">
          {isProfileComplete
            ? "Need a fresh document based on the fields below?"
            : "Complete your profile below to generate a resume from it."}
        </p>
        <FormButton
          variant="primary"
          icon={isGenerating ? undefined : <FileText className="h-4 w-4" />}
          disabled={!isProfileComplete || isGenerating}
          title={isProfileComplete ? undefined : "Complete your profile first"}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Resume from Profile"
          )}
        </FormButton>
      </div>

      {generateError && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{generateError}</span>
        </div>
      )}
    </div>
  );
}
