import type { InputHTMLAttributes, ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
};

export function Input({ label, id, className = "", icon, ...props }: Props) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted ${icon ? "pl-9" : ""} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
