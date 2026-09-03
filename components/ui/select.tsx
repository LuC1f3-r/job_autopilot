import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";

export type SelectOption = string | { label: string; value: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
};

export function Select({ label, options, id, className = "", ...props }: Props) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 pr-9 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none ${className}`}
          {...props}
        >
          {options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const displayLabel = typeof option === "string" ? option : option.label;
            return (
              <option key={value} value={value}>
                {displayLabel}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}
