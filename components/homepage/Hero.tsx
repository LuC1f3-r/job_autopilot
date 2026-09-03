import Image from "next/image";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  ctaHref?: string;
};

export function Hero({ ctaHref = "/login" }: Props) {
  return (
    <section className="flex flex-col items-center gap-10">
      <div className="bg-hero-gradient w-full rounded-2xl border border-border px-6 py-20 text-center mt-10">
        <h1 className="text-4xl font-bold text-text-primary md:text-5xl">
          Job hunting is hard.
          <br />
          Your tools shouldn&apos;t be.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-text-secondary">
          Stop applying blind. JobPilot finds the jobs, researches the
          companies, and gives you everything you need to stand out.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            href={ctaHref}
            variant="dark"
            icon={<Play className="size-3.5" fill="currentColor" />}
            event="cta_clicked"
            eventProps={{ location: "hero", label: "Get Started" }}
          >
            Get Started
          </Button>
          <Button
            href={ctaHref}
            variant="dark-outline"
            event="cta_clicked"
            eventProps={{ location: "hero", label: "Find Your First Match" }}
          >
            Find Your First Match
          </Button>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-border bg-surface p-6">
        <Image
          src="/images/dashboard-demo.png"
          alt="JobPilot dashboard preview"
          width={2144}
          height={1656}
          className="w-full rounded-xl"
          priority
        />
      </div>
    </section>
  );
}
