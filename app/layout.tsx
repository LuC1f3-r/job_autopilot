import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PostHogIdentify } from "@/components/auth/SignOutButton";
import { getSessionUser } from "@/lib/insforge-server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "JobPilot",
  description:
    "JobPilot finds the jobs, researches the companies, and gives you everything you need to stand out.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {user && (
          <PostHogIdentify
            userId={user.id}
            email={user.email}
            name={user.profile?.name}
          />
        )}
        {children}
      </body>
    </html>
  );
}
