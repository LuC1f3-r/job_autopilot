import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileAttentionBanner } from "@/components/profile/ProfileAttentionBanner";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { createInsforgeServer, getSessionUser } from "@/lib/insforge-server";
import { Profile, calculateProfileCompletion } from "@/lib/profile-types";

export default async function ProfilePage() {
  const user = await getSessionUser();

  let profile: Profile | null = null;
  if (user?.id) {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id);

    if (!error && data && data.length > 0) {
      profile = data[0] as Profile;
    }

    // If profile does not have resume_pdf_url, check if resume exists in InsForge storage
    if (!profile?.resume_pdf_url) {
      try {
        const objectKey = `${user.id}/resume.pdf`;
        const { data: blob, error: storageError } = await insforge.storage
          .from("resumes")
          .download(objectKey);

        if (!storageError && blob && blob.size > 0) {
          const publicUrlRes = insforge.storage.from("resumes").getPublicUrl(objectKey);
          const resumeUrl =
            publicUrlRes?.data?.publicUrl ||
            `${process.env.NEXT_PUBLIC_INSFORGE_URL}/api/storage/buckets/resumes/objects/${encodeURIComponent(objectKey)}`;

          if (profile) {
            profile.resume_pdf_url = resumeUrl;
            await insforge.database
              .from("profiles")
              .update({ resume_pdf_url: resumeUrl })
              .eq("id", user.id);
          } else {
            profile = {
              id: user.id,
              email: user.email ?? "",
              full_name: null,
              phone: null,
              location: null,
              current_title: null,
              experience_level: null,
              years_experience: null,
              skills: null,
              industries: null,
              work_experience: null,
              education: null,
              job_titles_seeking: null,
              remote_preference: null,
              preferred_locations: null,
              salary_expectation: null,
              cover_letter_tone: null,
              linkedin_url: null,
              portfolio_url: null,
              work_authorization: null,
              resume_pdf_url: resumeUrl,
              is_complete: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await insforge.database.from("profiles").insert([profile]);
          }
        }
      } catch (storageCheckError) {
        console.error("[ProfilePage] Failed to check storage for resume:", storageCheckError);
      }
    }
  }

  const completion = calculateProfileCompletion(profile);

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-8 py-8">
        <ProfileAttentionBanner
          completionPercent={completion.percentage}
          missingFields={completion.missingFields}
        />
        <ProfileEditor
          email={user?.email ?? profile?.email ?? ""}
          initialData={profile}
        />
      </main>
      <Footer />
    </>
  );
}
