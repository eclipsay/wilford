import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const mssDuties = [
  "Intelligence",
  "Internal Stability",
  "Anti-Subversion",
  "Executive Protection",
  "Cyber Monitoring",
  "Strategic Security"
];

const mssSections = [
  ["🚨", "Alerts", "Financial crime, contraband, suspicious transfers, and security notices."],
  ["🔎", "Investigations", "Review citizens, wallets, inventories, stock portfolios, and records."],
  ["📜", "Enemy Registry", "Public and restricted Enemy of the State records."],
  ["💳", "Financial Crime", "Wallet freezes, fines, bounties, and portfolio restrictions."],
  ["👁", "Watchlist", "Ongoing monitoring for restricted activity and insider trading."]
];

export const metadata = {
  title: "Ministry of State Security"
};

export default function MinistryOfStateSecurityPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="MSS"
        title="Ministry Of State Security"
        description="Vigilance Preserves Unity."
      />

      <main className="content content--wide mss-page">
        <section className="mss-command scroll-fade">
          <div>
            <p className="eyebrow">Strategic Security Directorate</p>
            <h2>The Watchful Arm Of The Union</h2>
            <p>
              The Ministry of State Security protects the continuity of the
              Chairman, the integrity of government, and the stability of every
              district. It identifies threats before they become disorder and
              preserves unity through vigilance, discipline, and silence.
            </p>
          </div>
          <div className="mss-seal">
            <span>MSS</span>
            <strong>Vigilance Preserves Unity</strong>
          </div>
        </section>

        <section className="premium-grid premium-grid--three scroll-fade" aria-label="MSS responsibilities">
          {mssDuties.map((duty) => (
            <article className="premium-card premium-card--security" key={duty}>
              <h3>{duty}</h3>
              <p>Maintained under classified ministry authority.</p>
            </article>
          ))}
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">MSS Organisation</p>
          <h2>Security Work Areas</h2>
          <div className="portal-grid">
            {mssSections.map(([icon, title, text]) => (
              <article className="panel citizen-helper-card" key={title}>
                <h3>{icon} {title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="restricted-banner restricted-banner--mss scroll-fade">
          <span>State Security Notice</span>
          <strong>Stability is not requested. It is maintained.</strong>
          <p>
            Citizens with urgent security information should report through
            approved district channels.
          </p>
          <Link className="button button--solid-site" href="/government-access">
            Government Access
          </Link>
          <Link className="button" href="/enemies-of-the-state">
            Public Enemy Registry
          </Link>
        </section>
      </main>
    </SiteLayout>
  );
}
