import Link from "next/link";
import { panelNavigation } from "@wilford/shared";

export function PanelShell({ title, description, children }) {
  return (
    <main className="shell">
      <header className="panel-header">
        <div>
          <p className="panel-header__eyebrow">Wilford Internal</p>
          <h1>{title}</h1>
          <p className="panel-header__copy">{description}</p>
        </div>

        <nav className="panel-nav">
          {panelNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/login">Lock</Link>
        </nav>
      </header>

      {children}
    </main>
  );
}
