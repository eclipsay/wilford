import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent } from "../lib/content";

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <main className="content content--hero">
        <section className="homepage-image-hero">
          <div className="homepage-image-hero__overlay">
            <p className="eyebrow">{content.settings.homepageEyebrow}</p>
            <h1>{content.settings.homepageHeadline}</h1>
            <p className="lead">{content.settings.homepageDescription}</p>

            <div className="homepage-image-hero__totals">
              <article>
                <span>Total Members</span>
                <strong>{content.members.length}</strong>
              </article>
              <article>
                <span>Total Excommunications</span>
                <strong>{content.excommunications.length}</strong>
              </article>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
