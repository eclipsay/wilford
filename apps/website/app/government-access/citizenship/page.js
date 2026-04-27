import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "Citizenship Review | Government Access"
};

export default async function CitizenshipReviewPage() {
  await requireGovernmentUser("citizenshipReview");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Civic Intake"
        title="Citizenship Review"
        description="Clerk review console placeholder for citizenship applications."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>
        <section className="panel government-user-panel">
          <p className="eyebrow">Citizenship Applications</p>
          <h2>Review Queue</h2>
          <p>
            Restricted access is active. This console is reserved for future
            application review tools and clerk workflows.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
