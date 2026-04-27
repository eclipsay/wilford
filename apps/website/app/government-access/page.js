import Link from "next/link";
import { PublicDecrypter } from "../../components/PublicDecrypter";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const restrictedRecords = [
  {
    title: "Command Registry",
    text: "Operational command references, staff tools, and review workflows.",
    href: "/commands"
  },
  {
    title: "National Security Register",
    text: "Formal register of removed individuals, hostile nations, and state adversaries.",
    href: "/excommunication"
  },
  {
    title: "Internal Records",
    text: "Restricted administrative ledgers and ministry record indexes.",
    href: "/commits"
  },
  {
    title: "Executive Notices",
    text: "Priority notices issued for executive review and state continuity.",
    href: "/panel-access"
  }
];

export const metadata = {
  title: "Government Access"
};

export default function GovernmentAccessPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Government Channel"
        title="Government Access"
        description="Secure communications, command records, security registers, internal records, and executive notices."
      />

      <main className="content content--wide portal-page portal-page--restricted">
        <section className="restricted-banner scroll-fade">
          <span>Restricted State Access</span>
          <strong>Ministry credentials required beyond this point.</strong>
          <p>
            Unauthorized handling of government material is recorded by the
            Ministry of State Security.
          </p>
        </section>

        <section className="state-section government-access-comms scroll-fade" aria-labelledby="secure-comms-title">
          <p className="eyebrow">Secure Communications</p>
          <h2 id="secure-comms-title">Encrypted State Channel</h2>
          <PublicDecrypter />
        </section>

        <section className="portal-grid portal-grid--restricted scroll-fade" aria-label="Government access records">
          {restrictedRecords.map((record) => (
            <Link className="portal-card portal-card--restricted" href={record.href} key={record.title}>
              <span>{record.title}</span>
              <p>{record.text}</p>
              <strong>Authorize</strong>
            </Link>
          ))}
        </section>
      </main>
    </SiteLayout>
  );
}
