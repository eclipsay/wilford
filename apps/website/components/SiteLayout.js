import Link from "next/link";
import Image from "next/image";
import { brand } from "@wilford/shared";

const stateNavigation = [
  { label: "Our State", href: "/information" },
  { label: "The Chairman", href: "/chairman" },
  { label: "Our Industries", href: "/decrypter" },
  { label: "The People", href: "/members" },
  { label: "News & Propaganda", href: "/commits" },
  { label: "Careers", href: "/panel-access" },
  { label: "Contact", href: "mailto:contact@wilfordindustries.org" }
];

export function SiteLayout({ children }) {
  const panelUrl =
    process.env.NEXT_PUBLIC_PANEL_URL ||
    "https://panel.wilfordindustries.org";

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <Image
            className="brand-mark"
            src="/creed-icons/header-w.png"
            alt=""
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
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          className="button"
          href={panelUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span>Citizen Portal</span>
          <span aria-hidden="true">+</span>
        </a>
      </header>

      {children}
    </div>
  );
}
