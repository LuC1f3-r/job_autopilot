"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { FormButton } from "@/components/ui/form-button";
import { uploadResume } from "@/actions/profile";

type Props = {
  currentResumeUrl?: string | null;
};

export function ResumeUpload({ currentResumeUrl }: Props) {
  const [resumeUrl, setResumeUrl] = useState<string | null>(currentResumeUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
        setResumeUrl(res.url);
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
              variant="secondary"
              disabled={isUploading}
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

      <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
        <p className="text-sm text-text-secondary">Need a fresh document based on the fields below?</p>
        <FormButton variant="primary" icon={<FileText className="h-4 w-4" />}>
          Generate Resume from Profile
        </FormButton>
      </div>
    </div>
  );
}
