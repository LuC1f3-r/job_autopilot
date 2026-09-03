import type { TextareaHTMLAttributes } from "react";
import { FieldLabel } from "@/components/ui/field-label";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ label, id, className = "", ...props }: Props) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        id={textareaId}
        rows={3}
        className={`w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
