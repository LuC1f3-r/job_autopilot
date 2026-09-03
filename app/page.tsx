import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { Features } from "@/components/homepage/Features";
import { Testimonial } from "@/components/homepage/Testimonial";
import { CTA } from "@/components/homepage/CTA";
import { getSessionUser } from "@/lib/insforge-server";

export default async function Home() {
  const user = await getSessionUser();
  // TODO: point signed-in CTAs at /dashboard once that route exists.
  const ctaHref = user ? "/" : "/login";

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-8">
        <Hero ctaHref={ctaHref} />
        <HowItWorks />
        <Features />
        <Testimonial />
        <CTA ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
