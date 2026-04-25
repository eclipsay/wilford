import Link from "next/link";
import { brand, mainNavigation } from "@wilford/shared";

export function SiteLayout({ children }) {
  const panelUrl =
    process.env.NEXT_PUBLIC_PANEL_URL ||
    "https://panel.wilfordindustries.org";

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">W</span>
          <span className="brand-copy">
            <strong>{brand.name}</strong>
            <small>{brand.tagline}</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {mainNavigation.map((item) => (
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
          Panel Access
        </a>
      </header>

      {children}
    </div>
  );
}
