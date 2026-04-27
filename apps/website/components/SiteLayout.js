import Link from "next/link";
import Image from "next/image";
import { brand } from "@wilford/shared";
import { NewsTicker } from "./NewsTicker";

const stateNavigation = [
  { label: "The Chairman", href: "/chairman" },
  { label: "The Government", href: "/government" },
  { label: "The Union", href: "/information" },
  { label: "The People", href: "/members" },
  { label: "Panem Credit", href: "/panem-credit" },
  { label: "Ministry of State Security", href: "/ministry-of-state-security" },
  { label: "SUPREME COURT", href: "/supreme-court" },
  { label: "Citizen Portal", href: "/citizen-portal" },
  { label: "CITIZENSHIP", href: "/citizenship" },
  { label: "Government Access", href: "/government-access", align: "right" }
];

export async function SiteLayout({ children }) {
  const panelUrl = "https://panel.wilfordindustries.org/";

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <Image
            className="brand-mark"
            src="/creed-icons/header-wpu.png"
            alt="WPU symbol"
            aria-hidden="true"
            width={112}
            height={112}
            priority
          />
          <span className="brand-copy">
            <strong>{brand.name}</strong>
            <small>{brand.tagline}</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {stateNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.align === "right" ? "nav__push-right" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          className="button admin-portal-button"
          href={panelUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span>Admin Portal</span>
          <span aria-hidden="true">+</span>
        </a>
      </header>

      <NewsTicker />

      {children}

      <footer className="site-footer" aria-label="Official state portal">
        <Image
          className="grand-seal-small"
          src="/wpu-grand-seal.png"
          alt="Grand Seal of the Wilford Panem Union"
          width={128}
          height={128}
        />
        <div className="site-footer__copy">
          <strong>Official State Portal of the Wilford Panem Union</strong>
          <span>One Union. One Future.</span>
          <nav className="site-footer__links" aria-label="Footer navigation">
            <Link href="/government">Government</Link>
            <Link href="/information">The Union</Link>
            <Link href="/panem-credit">Panem Credit</Link>
            <Link href="/supreme-court">Supreme Court</Link>
            <Link href="/citizenship">Citizenship</Link>
            <Link href="/chairman">The Chairman</Link>
            <Link href="/citizen-portal">Citizen Portal</Link>
            <Link href="/government-access">Government Access</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
