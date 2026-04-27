import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseAccessPanel } from "../../../components/CaseAccessPanel";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getSupremeCourtCase } from "../../../lib/supreme-court";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { caseId } = await params;
  const courtCase = await getSupremeCourtCase(caseId);

  return {
    title: courtCase ? `${courtCase.caseNumber} | Supreme Court` : "Supreme Court Case"
  };
}

function RecordList({ items, empty }) {
  if (!items.length) {
    return <p className="court-empty">{empty}</p>;
  }

  return (
    <ul className="court-record-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function SupremeCourtCasePage({ params }) {
  const { caseId } = await params;
  const courtCase = await getSupremeCourtCase(caseId);

  if (!courtCase) {
    notFound();
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow={courtCase.caseNumber}
        title={courtCase.title}
        description={`${courtCase.status} / ${courtCase.courtroom}`}
      />

      <main className="content content--wide court-case-page">
        <Link className="button" href="/supreme-court">
          Back to Supreme Court
        </Link>

        <section className="court-case-dossier scroll-fade">
          <div className="court-case-dossier__main">
            <p className="eyebrow">Public Case Page</p>
            <h2>{courtCase.title}</h2>
            <p>{courtCase.summary}</p>
          </div>
          <dl className="court-docket-grid">
            <div>
              <dt>Case Number</dt>
              <dd>{courtCase.caseNumber}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{courtCase.status}</dd>
            </div>
            <div>
              <dt>Date Opened</dt>
              <dd>{courtCase.dateOpened}</dd>
            </div>
            <div>
              <dt>Courtroom</dt>
              <dd>{courtCase.courtroom}</dd>
            </div>
            <div>
              <dt>Judge / Presiding Official</dt>
              <dd>{courtCase.presidingOfficial}</dd>
            </div>
            <div>
              <dt>Parties</dt>
              <dd>{courtCase.parties.join(" / ") || "Parties pending entry"}</dd>
            </div>
          </dl>
        </section>

        <section className="court-case-layout">
          <div className="court-record-column">
            <section className="panel court-record-panel scroll-fade">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Live Case Updates</p>
                  <h2>Timeline Updates</h2>
                </div>
              </div>
              <ol className="court-timeline">
                {courtCase.timeline.map((item) => (
                  <li key={item.id}>
                    <span>{item.date}</span>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="panel court-record-panel scroll-fade">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Filed Material</p>
                  <h2>Evidence List</h2>
                </div>
              </div>
              <RecordList items={courtCase.evidence} empty="No public evidence has been listed." />
            </section>

            <section className="panel court-record-panel scroll-fade">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Bench Orders</p>
                  <h2>Rulings / Orders</h2>
                </div>
              </div>
              <RecordList items={courtCase.rulings} empty="No rulings or orders have been entered." />
            </section>

            <section className="panel court-record-panel scroll-fade">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Public Notes</p>
                  <h2>Court Registry Notes</h2>
                </div>
              </div>
              <p>{courtCase.publicNotes || "No public notes have been entered for this matter."}</p>
            </section>
          </div>

          <aside className="court-participation-column">
            <CaseAccessPanel caseId={courtCase.id} />
          </aside>
        </section>
      </main>
    </SiteLayout>
  );
}
