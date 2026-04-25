import Link from "next/link";
import { panelNavigation } from "@wilford/shared";

export default function PanelHomePage() {
  return (
    <main className="shell">
      <header className="header">
        <div>
          <p>Wilford Internal</p>
          <h1>Panel Dashboard</h1>
        </div>
        <nav style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {panelNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="cards">
        <article className="card">
          <h2>Members</h2>
          <p>Internal member and standing management.</p>
        </article>
        <article className="card">
          <h2>Commits</h2>
          <p>Moderated repository activity and controls.</p>
        </article>
        <article className="card">
          <h2>System</h2>
          <p>Health, deployment, and service monitoring.</p>
        </article>
      </section>
    </main>
  );
}
