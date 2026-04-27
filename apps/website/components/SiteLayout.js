import Link from "next/link";
import Image from "next/image";
import { brand } from "@wilford/shared";

const stateNavigation = [
  { label: "The Chairman", href: "/chairman" },
  { label: "The Government", href: "/government" },
  { label: "The Union", href: "/information" },
  { label: "The People", href: "/members" },
  { label: "Panem Credit", href: "/panem-credit" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Wilford Decrypter", href: "/decrypter" },
  { label: "Apply", href: "/apply" },
  { label: "Command Archive", href: "/commands" },
  { label: "Excommunication List", href: "/excommunication" },
  { label: "Commits", href: "/commits", align: "right" }
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
          className="button"
          href={panelUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span>Admin Portal</span>
          <span aria-hidden="true">+</span>
        </a>
      </header>

      {children}
    </div>
  );
}
