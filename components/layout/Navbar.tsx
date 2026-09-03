import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSessionUser } from "@/lib/insforge-server";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

export async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="h-16 w-full bg-surface px-6 flex items-center justify-between">
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.png"
          alt="JobPilot"
          width={496}
          height={168}
          priority
          className="h-9 w-auto"
        />
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-text-dark hover:text-accent"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {user ? (
        <SignOutButton />
      ) : (
        <Button
          href="/login"
          variant="slate"
          size="sm"
          event="cta_clicked"
          eventProps={{ location: "navbar", label: "Start for free" }}
        >
          Start for free
        </Button>
      )}
    </header>
  );
}
