import { brand } from "@wilford/shared";
import { PageHero } from "../components/PageHero";
import { SiteLayout } from "../components/SiteLayout";

export default function HomePage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Welcome to"
        title={brand.name}
        description={`A monument to order, expansion, and industrial discipline under the leadership of Chairman ${brand.chairman}.`}
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
            <p>Recognized members, standing, and organization records.</p>
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
