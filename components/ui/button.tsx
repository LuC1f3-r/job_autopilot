"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import posthog from "posthog-js";

type ButtonVariant = "dark" | "dark-outline" | "slate";
type ButtonSize = "sm" | "md";

type Props = {
  href: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  /** PostHog event name to capture on click. Omit for buttons that don't need tracking. */
  event?: string;
  eventProps?: Record<string, unknown>;
};

const variantClasses: Record<ButtonVariant, string> = {
  dark: "bg-text-darker text-white hover:bg-text-darkest",
  "dark-outline":
    "bg-surface/90 backdrop-blur-sm border border-border text-text-primary hover:bg-surface-secondary",
  slate: "bg-text-slate text-white hover:bg-text-darkest",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm rounded-md",
  md: "px-6 py-3 text-base rounded-lg",
};

export function Button({ href, variant, size = "md", children, icon, event, eventProps }: Props) {
  return (
    <Link
      href={href}
      onClick={event ? () => posthog.capture(event, eventProps) : undefined}
      className={`inline-flex items-center gap-2 font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
      {icon}
    </Link>
  );
}
