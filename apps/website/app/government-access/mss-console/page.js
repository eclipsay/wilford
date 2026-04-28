import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "MSS Console | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MssConsolePage() {
  await requireGovernmentUser("mssTools");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of State Security"
        title="MSS Console"
        description="Restricted security command console for authorised MSS leadership."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>
        <section className="panel government-user-panel">
          <p className="eyebrow">MSS Command</p>
          <h2>Security Tools Locked Behind Role Access</h2>
          <p>
            Restricted access is active. Future Ministry of State Security tools
            can be mounted here without exposing them to public navigation.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
