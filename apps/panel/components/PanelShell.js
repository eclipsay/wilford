import Link from "next/link";
import { panelNavigation } from "@wilford/shared";
import { clearAuthenticatedSession, getSession } from "../lib/auth";

async function logoutAction() {
  "use server";
  await clearAuthenticatedSession();
}

export async function PanelShell({ title, description, children }) {
  const session = await getSession();
  const baseNavigation = [
    { label: "Dashboard", href: "/" },
    { label: "Members", href: "/members" },
    { label: "Excommunications", href: "/excommunications" },
    { label: "Settings", href: "/settings" },
    { label: "Commits", href: "/commits" },
    { label: "Audit Log", href: "/audit-log" },
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
    if (item.href === "/users") {
      return ["owner", "admin"].includes(session?.role);
    }

    return true;
  });

  return (
    <main className="shell">
      <header className="panel-header">
        <div className="panel-header__top">
          <div className="panel-header__brand">
            <div className="panel-brand-mark" aria-hidden="true">
              W
            </div>
            <div>
              <p className="panel-header__eyebrow">Wilford Internal</p>
              <h1>{title}</h1>
              <p className="panel-header__copy">{description}</p>
            </div>
          </div>

          <div className="panel-header__account">
            <div className="panel-status-pill">
              <span />
              Live Control Room
            </div>
            <span className="panel-nav__identity">
              {session?.username} / {session?.role}
            </span>
            <form action={logoutAction}>
              <button className="button button--ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
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
