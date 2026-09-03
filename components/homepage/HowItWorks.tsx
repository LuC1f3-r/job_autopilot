import Image from "next/image";

type FeatureItem = {
  title: string;
  description: string;
  active?: boolean;
};

const items: FeatureItem[] = [
  {
    title: "Find jobs that actually fit",
    description:
      "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
    active: true,
  },
  {
    title: "Know the Company Before You Apply",
    description:
      "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    description:
      "Keep a clear view of every job you've found, tailored. Your activity and progress all stay in one simple place.",
  },
];

export function HowItWorks() {
  return (
    <section className="grid grid-cols-1 gap-10 py-16 md:grid-cols-2 md:gap-16">
      <div>
        <h2 className="text-3xl font-bold text-text-primary">
          Manage Your Job Search With Ease
        </h2>

        <div className="mt-10 border-t border-border-light">
          {items.map((item) => (
            <div
              key={item.title}
              className={`border-b border-border-light py-6 pl-6 ${
                item.active
                  ? "border-l-2 border-l-accent-dark"
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

      <div className="flex items-center rounded-2xl bg-surface-muted p-6">
        <Image
          src="/images/jobs-lists.png"
          alt="Jobs matched with match score, salary estimate, and source"
          width={2364}
          height={1778}
          className="w-full rounded-xl"
        />
      </div>
    </section>
  );
}
