import { PageHero } from "../components/PageHero";
import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent } from "../lib/content";

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow={content.settings.homepageEyebrow}
        title={content.settings.homepageHeadline}
        description={content.settings.homepageDescription}
      />

      <main className="content">
        <section className="grid">
          <article className="panel">
            <p className="eyebrow">Information</p>
            <h2>Lore</h2>
            <p>Official history, doctrine, and defining events of Wilford Industries.</p>
          </article>
          <article className="panel">
            <p className="eyebrow">Records</p>
            <h2>Members List</h2>
            <p>{content.members.length} recognized members are currently listed in public records.</p>
          </article>
          <article className="panel">
            <p className="eyebrow">Development</p>
            <h2>Commits</h2>
            <p>Visible repository activity filtered through Wilford policy rules.</p>
          </article>
        </section>
      </main>
    </SiteLayout>
  );
}
