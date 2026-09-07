// Derives a company's public homepage URL from the Adzuna redirect URL
// saved on the job row (jobs.source_url). No browser needed for this step —
// a plain server-side fetch() follows HTTP redirects natively before
// Stagehand ever opens, per context/build-plan.md Feature 13.

function stripSubdomain(hostname: string): string {
  const parts = hostname.split(".");
  // Keep the last two labels (e.g. "jobs.stripe.com" -> "stripe.com").
  // Leaves already-bare domains (e.g. "stripe.com") and unusual TLDs alone —
  // good enough for the common case this feature targets.
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

export async function deriveHomepageUrl(
  redirectUrl: string | null,
  companyName: string | null
): Promise<string> {
  const fallback = `https://www.${(companyName || "company").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;

  if (!redirectUrl) return fallback;

  try {
    const response = await fetch(redirectUrl, { redirect: "follow" });
    const finalUrl = response.url;

    if (!finalUrl || finalUrl.includes("adzuna.com")) {
      return fallback;
    }

    const rootDomain = stripSubdomain(new URL(finalUrl).hostname);
    return `https://${rootDomain}`;
  } catch (error) {
    console.warn("[lib/company-homepage] redirect-follow failed, using fallback:", error);
    return fallback;
  }
}
