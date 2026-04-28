import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const citizenServices = [
  {
    title: "Public Services",
    text: "Service requests, civic assistance, district guidance, and official public resources.",
    href: "/government"
  },
  {
    title: "Citizenship",
    text: "Citizenship petitions, eligibility review, civic intake, and Union oath processing.",
    href: "/citizenship"
  },
  {
    title: "Panem Credit Access",
    text: "Citizen wallet status, wage access, district trade, and treasury privileges.",
    href: "/panem-credit"
  },
  {
    title: "Identity Verification",
    text: "Confirm citizen identity, district records, and eligibility for state services.",
    href: "/panem-credit"
  },
  {
    title: "News Bulletins",
    text: "Official notices, civic updates, ministry announcements, and public advisories.",
    href: "/information"
  }
];

export const metadata = {
  title: "Citizen Portal"
};

export default function CitizenPortalPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Citizen Services"
        title="Citizen Portal"
        description="Public access to Union services, applications, credit, identity verification, and official bulletins."
      />

      <main className="content content--wide portal-page portal-page--citizen">
        <section className="portal-intro scroll-fade">
          <div>
            <p className="eyebrow">Public Civic Access</p>
            <h2>Service Through Order</h2>
            <p>
              The Citizen Portal provides a clear public entry point for
              approved services of the Wilford Panem Union. Records remain
              verified. Access remains orderly. The citizen is never outside
              the care of the state.
            </p>
          </div>
          <div className="portal-status">
            <span>Citizen Access</span>
            <strong>Open</strong>
            <p>Identity verification recommended for full privileges.</p>
          </div>
        </section>

        <section className="portal-grid scroll-fade" aria-label="Citizen portal services">
          {citizenServices.map((service) => (
            <Link className="portal-card portal-card--public" href={service.href} key={service.title}>
              <span>{service.title}</span>
              <p>{service.text}</p>
              <strong>Proceed</strong>
            </Link>
          ))}
        </section>
      </main>
    </SiteLayout>
  );
}
