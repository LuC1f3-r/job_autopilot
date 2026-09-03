import Image from "next/image";

type FeatureItem = {
  title: string;
  description: string;
  active?: boolean;
};

const items: FeatureItem[] = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what's missing.",
  },
  {
    title: "AI-Powered Job Matching",
    description:
      "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
    active: true,
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

export function Features() {
  return (
    <section className="grid grid-cols-1 gap-10 py-16 md:grid-cols-2 md:gap-16">
      <div className="order-2 flex items-center rounded-2xl bg-surface-muted p-6 md:order-1">
        <Image
          src="/images/agnet-log.png"
          alt="JobPilot agent log tailoring a resume and generating a cover letter"
          width={2144}
          height={1656}
          className="w-full rounded-xl"
        />
      </div>

      <div className="order-1 md:order-2">
        <h2 className="text-3xl font-bold text-text-primary">
          Apply With More Confidence, Every Time
        </h2>

        <div className="mt-10 border-t border-border-light">
          {items.map((item) => (
            <div
              key={item.title}
              className={`border-b border-border-light py-6 pl-6 ${
                item.active
                  ? "border-l-2 border-l-success-dark"
                  : "border-l border-l-border-light"
              }`}
            >
              <h3 className="text-base font-semibold text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
