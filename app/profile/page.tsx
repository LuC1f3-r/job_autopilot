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
