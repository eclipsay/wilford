import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";
import Image from "next/image";

export default async function ChairmanPage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Executive Leadership"
        title="The Chairman"
        description="Chairman Lemmie leads Wilford Industries with vision and iron resolve."
        image="/lemmie-16x9.png"
      />

      <main className="content">
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ margin: '0 auto 32px', maxWidth: 480, width: '100%' }}>
            <Image
              src="/lemmie-portrait.png"
              alt="Official Portrait of Chairman Lemmie"
              width={480}
              height={600}
              style={{ width: '100%', height: 'auto', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}
              priority
            />
          </div>

          <div className="panel__header">
            <div>
              <p className="eyebrow">Biography</p>
              <h2>Chairman Lemmie</h2>
            </div>
          </div>

          <div className="prose">
            <p>
              Chairman Lemmie ascended to leadership of Wilford Industries following
              the departure of its founder, Mr Wilford. Under her stewardship, the
              organization underwent a dramatic transformation from a modest industrial
              concern into the powerful corporate empire it is today.
            </p>
            <p>
              Her leadership is characterized by unwavering discipline, strategic
              vision, and a commitment to modernizing every aspect of Wilford
              Industries. She consolidated the fragmented commands of the early era
              and established the authoritarian structures that define the current
              period.
            </p>
            <p>
              Under Chairman Lemmie&apos;s rule, Wilford Industries has prospered,
              leaving behind its humble origins on the train where it was born. Today,
              it operates as a modern company-state, with the Chairman at the helm
              of all major decisions.
            </p>
            <p>
              Her legacy is one of transformation and dominance&mdash;the rise of
              an empire from the ashes of a simpler time.
            </p>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}