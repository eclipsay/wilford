import Link from "next/link";
import Image from "next/image";
import { brand } from "@wilford/shared";
import { NewsTicker } from "./NewsTicker";
import { getCitizenState, getCurrentCitizen } from "../lib/citizen-state";

const stateNavigation = [
  { label: "The Chairman", href: "/chairman" },
  { label: "The Government", href: "/government" },
  { label: "The Union", href: "/information" },
  { label: "The News", href: "/news" },
  { label: "The People", href: "/members" },
  { label: "Districts", href: "/districts" },
  { label: "Ministry of State Security", href: "/ministry-of-state-security" },
  { label: "Enemy Registry", href: "/enemies-of-the-state" },
  { label: "Supreme Court", href: "/supreme-court" },
  { label: "Citizen Portal", href: "/citizen-portal" },
  { label: "Citizenship", href: "/citizenship" },
  { label: "Government Access", href: "/government-access", align: "right" }
];

export async function SiteLayout({ children }) {
  const panelUrl = "https://panel.wilfordindustries.org/";
  const citizen = await getCurrentCitizen();
  let recentAlerts = [];
  let unreadCount = 0;

  if (citizen) {
    try {
      const state = await getCitizenState();
      recentAlerts = (state.citizenAlerts || [])
        .filter((alert) => alert.citizenId === citizen.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 8);
      unreadCount = recentAlerts.filter((alert) => !alert.readByCitizen).length;
      if (recentAlerts.length < (state.citizenAlerts || []).filter((alert) => alert.citizenId === citizen.id && !alert.readByCitizen).length) {
        unreadCount = (state.citizenAlerts || []).filter((alert) => alert.citizenId === citizen.id && !alert.readByCitizen).length;
      }
    } catch {
      recentAlerts = [];
      unreadCount = 0;
    }
  }

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

        <details className={`notification-menu${unreadCount ? " notification-menu--active" : ""}`}>
          <summary aria-label={`Citizen notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
            <span className="notification-menu__icon" aria-hidden="true">🔔</span>
            {unreadCount > 0 ? <span className="notification-menu__badge">{unreadCount}</span> : null}
          </summary>
          <section className="notification-menu__panel" aria-label="Recent notifications">
            <div className="notification-menu__header">
              <strong>Notifications</strong>
              {citizen && unreadCount > 0 ? (
                <form action="/citizen-portal/action" method="post">
                  <input name="intent" type="hidden" value="mark_all_alerts_read" />
                  <button type="submit">Mark all read</button>
                </form>
              ) : null}
            </div>
            {citizen ? (
              <div className="notification-menu__list">
                {recentAlerts.length ? recentAlerts.map((alert) => (
                  <Link
                    className={`notification-menu__item${alert.readByCitizen ? "" : " notification-menu__item--unread"}`}
                    href={`/citizen-portal/alerts/${encodeURIComponent(alert.id)}`}
                    key={alert.id}
                  >
                    <span className="notification-menu__type" aria-hidden="true">{iconForAlert(alert.type)}</span>
                    <span>
                      <strong>{alert.title || alert.type || "Official Notice"}</strong>
                      <small>{alert.message || alert.actionTaken || "Official notice issued."}</small>
                      <em>{formatAlertTime(alert.createdAt)}</em>
                    </span>
                  </Link>
                )) : (
                  <p className="notification-menu__empty">No citizen alerts recorded.</p>
                )}
              </div>
            ) : (
              <p className="notification-menu__empty">Enter the Citizen Portal to view notifications.</p>
            )}
            <Link className="notification-menu__all" href="/citizen-portal#citizen-alert-center">View All Alerts</Link>
          </section>
        </details>

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
        <span
          className="grand-seal-small"
          aria-label="Grand Seal of the Wilford Panem Union"
        >
          WPU
        </span>
        <div className="site-footer__copy">
          <strong>Official State Portal of the Wilford Panem Union</strong>
          <span>One Union. One Future.</span>
          <nav className="site-footer__links" aria-label="Footer navigation">
            <Link href="/government">Government</Link>
            <Link href="/news">The News</Link>
            <Link href="/information">The Union</Link>
            <Link href="/districts">Districts</Link>
            <Link href="/supreme-court">Supreme Court</Link>
            <Link href="/enemies-of-the-state">Enemy Registry</Link>
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

function iconForAlert(type = "") {
  if (/mss|wallet|raid|emergency/i.test(type)) return "!";
  if (/court|fine|tax/i.test(type)) return "§";
  if (/market|stock/i.test(type)) return "$";
  return "•";
}

function formatAlertTime(value = "") {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
