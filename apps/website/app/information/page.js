import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function InformationPage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Information Archive"
        title="Doctrine, Lore, and Records"
        description="The Information division preserves the official narrative of Wilford Industries."
      />

      <main className="content">
        <section className="grid">
          <article className="panel">
            <p className="eyebrow">Chairman</p>
            <h2>{content.settings.chairmanName}</h2>
            <p>The current executive identity recorded across the Wilford public network.</p>
          </article>
          <article className="panel">
            <p className="eyebrow">Members</p>
            <h2>{content.members.length}</h2>
            <p>Total recognized members currently shown in the public roster.</p>
          </article>
          <article className="panel">
            <p className="eyebrow">Discipline</p>
            <h2>{content.excommunications.length}</h2>
            <p>Published excommunication records currently visible to the public.</p>
          </article>
        </section>
      </main>
    </SiteLayout>
  );
}
