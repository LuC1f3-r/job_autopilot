import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Condition", href: "/terms-and-condition" },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface px-6 py-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 md:flex-row">
        <Image
          src="/logo.png"
          alt="JobPilot"
          width={496}
          height={168}
          className="h-9 w-auto"
        />

        <nav className="flex items-center gap-8">
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-secondary hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
