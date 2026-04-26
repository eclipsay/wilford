import Link from "next/link";
import { panelNavigation } from "@wilford/shared";
import { clearAuthenticatedSession, getSession } from "../lib/auth";

async function logoutAction() {
  "use server";
  await clearAuthenticatedSession();
}

export async function PanelShell({ title, description, children }) {
  const session = await getSession();
  const navigation = panelNavigation.filter((item) => {
    if (item.href === "/users") {
      return ["owner", "admin"].includes(session?.role);
    }

    return true;
  });

  return (
    <main className="shell">
      <header className="panel-header">
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

        <div className="panel-header__tools">
          <div className="panel-status-pill">
            <span />
            Live Control Room
          </div>

          <nav className="panel-nav">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <span className="panel-nav__identity">
              {session?.username} / {session?.role}
            </span>
            <form action={logoutAction}>
              <button className="button button--ghost" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {children}
    </main>
  );
}
