import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  ctaHref?: string;
};

export function CTA({ ctaHref = "/login" }: Props) {
  return (
    <section className="bg-hero-gradient w-full rounded-2xl border border-border px-6 py-20 text-center mb-10">
      <h2 className="text-3xl font-bold text-text-primary md:text-4xl">
        Your next job search can feel a<br />
        lot less overwhelming
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base text-text-secondary">
        Set up your profile, upload your resume, and start finding matches in
        minutes.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Button
          href={ctaHref}
          variant="dark"
          icon={<Play className="size-3.5" fill="currentColor" />}
          event="cta_clicked"
          eventProps={{ location: "footer_cta", label: "Get Started" }}
        >
          Get Started
        </Button>
        <Button
          href={ctaHref}
          variant="dark-outline"
          event="cta_clicked"
          eventProps={{ location: "footer_cta", label: "Find Your First Match" }}
        >
          Find Your First Match
        </Button>
      </div>
    </section>
  );
}
