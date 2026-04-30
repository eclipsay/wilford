import Link from "next/link";
import { panelNavigation } from "@wilford/shared";
import { clearAuthenticatedSession, getSession } from "../lib/auth";
import { createGovernmentBridgeHref } from "../lib/command-modules";

async function logoutAction() {
  "use server";
  await clearAuthenticatedSession();
}

export async function PanelShell({ title, description, children }) {
  const session = await getSession();
  const baseNavigation = [
    { label: "Dashboard", href: "/" },
    { label: "Government Users", href: "/government-users" },
    { label: "Articles", href: "/articles" },
    { label: "Bulletins", href: "/bulletins" },
    { label: "Audit Log", href: "/audit-log" },
    { label: "Commits", href: "/commits" },
    { label: "Settings", href: "/settings" },
    { label: "Users", href: "/users" },
    { label: "System", href: "/system" }
  ];
  const navigationSource =
    Array.isArray(panelNavigation) && panelNavigation.length
      ? baseNavigation.map(
          (item) =>
            panelNavigation.find((sharedItem) => sharedItem.href === item.href) ||
            item
        )
      : baseNavigation;
  const navigation = navigationSource.filter((item) => {
    if (["/users", "/government-users"].includes(item.href)) {
      return ["owner", "admin"].includes(session?.role);
    }

    return true;
  });

  return (
    <main className="shell">
      <header className="panel-header">
        <div className="panel-scanline" aria-hidden="true" />
        <div className="panel-header__top">
          <div className="panel-header__brand">
            <div className="panel-brand-mark" aria-hidden="true">
              &gt;_
            </div>
            <div>
              <p className="panel-header__eyebrow">Wilford Internal // Terminal Uplink</p>
              <h1>{title}</h1>
              <p className="panel-header__copy">{description}</p>
            </div>
          </div>

          <div className="panel-header__account">
            <div className="panel-status-pill">
              <span />
              Command Channel Live
            </div>
            <a
              className="button button--ghost"
              href={createGovernmentBridgeHref("/government-access", session || {})}
              rel="noreferrer"
              target="_blank"
            >
              Superadmin Gov Access
            </a>
            <span className="panel-nav__identity">
              user={session?.username} role={session?.role}
            </span>
            <form action={logoutAction}>
              <button className="button button--ghost" type="submit">
                Exit Session
              </button>
            </form>
          </div>
        </div>

        <div className="panel-terminal-line" aria-hidden="true">
          <span>$</span>
          <span> panel.boot --profile={session?.role || "guest"} --scope=admin</span>
        </div>

        <nav className="panel-nav">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </main>
  );
}
