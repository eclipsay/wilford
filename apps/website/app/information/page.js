import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function InformationPage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Information Archive"
        title="Doctrine, Lore, And Records"
        description="The Information division preserves the official narrative of Wilford Industries and maintains the state memory of its rise."
      />

      <main className="content">
        <section className="grid grid--feature">
          <article className="panel panel--feature">
            <p className="eyebrow">Chairman</p>
            <h2>{content.settings.chairmanName}</h2>
            <p>
              The current executive identity recorded across the Wilford public
              network and formal command structure.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Members</p>
            <h2>{content.members.length}</h2>
            <p>
              Total recognized members currently shown in the public roster and
              officially acknowledged by the archive.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Discipline</p>
            <h2>{content.excommunications.length}</h2>
            <p>
              Published excommunication records visible to the public as part of
              Wilford&apos;s disciplinary doctrine.
            </p>
          </article>
        </section>

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Official Narrative</p>
              <h2>Foundational Events</h2>
            </div>
          </div>

          <div className="public-record-list">
            <article className="public-record-item">
              <div>
                <h3>Central Consolidation</h3>
                <p>The early Wilford apparatus unified scattered industrial commands under one public standard.</p>
              </div>
              <div className="public-record-meta">
                <strong>Founding Era</strong>
                <span>Presented as the first moment where order overtook fragmentation.</span>
              </div>
            </article>

            <article className="public-record-item">
              <div>
                <h3>B-13 Doctrine</h3>
                <p>
                  B-13 is remembered as a momentous part of Wilford Industries
                  history, marking the sector where internal discipline became a
                  permanent public principle rather than a temporary necessity.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Historic Turning Point</strong>
                <span>The archive treats B-13 as a defining hinge in the company-state identity.</span>
              </div>
            </article>

            <article className="public-record-item">
              <div>
                <h3>Rise of Lemmie</h3>
                <p>
                  Following the B-13 era, Chairman Lemmie assumed control of Wilford Industries 
                  from its founder, Mr Wilford. Under her leadership, the organization transformed 
                  from a modest industrial operation into a powerful corporate empire. 
                  She consolidated power, modernized operations, and established the authoritarian 
                  structures that define Wilford today.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Transformation Era</strong>
                <span>The period where Wilford transitioned from humble beginnings to imperial dominance.</span>
              </div>
            </article>

            <article className="public-record-item">
              <div>
                <h3>Public Build Era</h3>
                <p>
                  Development visibility, commit archives, and controlled public
                  records now function as a modern expression of Wilford order.
                </p>
              </div>
              <div className="public-record-meta">
                <strong>Current Period</strong>
                <span>Following Chairman Lemmie's takeover from Mr Wilford, Wilford Industries has prospered and has long left the train it was born on.
                  It now operates as a modern company-state.
                </span>
              </div>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
