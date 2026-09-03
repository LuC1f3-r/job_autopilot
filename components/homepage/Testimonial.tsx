import Image from "next/image";

export function Testimonial() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">
        Success Stories
      </span>

      <blockquote className="max-w-3xl text-2xl font-medium text-text-primary">
        &ldquo;I used to spend my evenings copy-pasting resumes. Now I open my
        dashboard to see interviews waiting. It feels like cheating. Had 3
        offers on the table simultaneously.&rdquo;
      </blockquote>

      <div className="flex items-center gap-3">
        <Image
          src="/images/user-icon.png"
          alt="Tom Wilson"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <div className="text-left">
          <p className="text-sm font-semibold text-text-primary">
            Tom Wilson
          </p>
          <p className="text-xs text-text-secondary">Junior Developer</p>
        </div>
      </div>
    </section>
  );
}
