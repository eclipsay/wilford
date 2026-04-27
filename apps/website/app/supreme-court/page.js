import Link from "next/link";
import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSupremeCourtCases } from "../../lib/supreme-court";

export const metadata = {
  title: "Supreme Court"
};

export const dynamic = "force-dynamic";

function CaseCard({ courtCase }) {
  return (
    <article className="court-case-card">
      <div className="court-case-card__meta">
        <span>{courtCase.caseNumber}</span>
        <strong>{courtCase.status}</strong>
      </div>
      <h3>{courtCase.title}</h3>
      <dl className="court-case-card__details">
        <div>
          <dt>Date Opened</dt>
          <dd>{courtCase.dateOpened}</dd>
        </div>
        <div>
          <dt>Courtroom</dt>
          <dd>{courtCase.courtroom}</dd>
        </div>
      </dl>
      <p>{courtCase.summary}</p>
      <Link className="button button--solid-site" href={`/supreme-court/${courtCase.id}`}>
        View Case
      </Link>
    </article>
  );
}

export default async function SupremeCourtPage() {
  const cases = await getSupremeCourtCases();
  const liveCases = cases.filter((courtCase) =>
    ["Filed", "Under Review", "Hearing Scheduled", "Hearing in Progress", "Deliberation"].includes(
      courtCase.status
    )
  );
  const judgments = cases.filter((courtCase) => courtCase.status === "Judgment Issued");
  const archive = cases.filter((courtCase) => ["Closed", "Sealed"].includes(courtCase.status));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Supreme Court"
        title="SUPREME COURT OF THE WILFORD PANEM UNION"
        description="Justice in Service of Order"
      />

      <main className="content content--wide supreme-court-page">
        <section className="court-institution scroll-fade">
          <div>
            <p className="eyebrow">High Chamber</p>
            <h2>Public transparency under formal authority</h2>
            <p>
              The Supreme Court publishes live proceedings, judgments, archived
              records, and official notices while reserving participation for
              authorised parties with active case access keys.
            </p>
          </div>
          <Image
            className="court-institution__seal"
            src="/wpu-grand-seal.png"
            alt="Grand Seal of the Wilford Panem Union"
            width={128}
            height={128}
          />
        </section>

        <section className="court-section scroll-fade" aria-labelledby="live-cases-title">
          <div className="court-section__header">
            <p className="eyebrow">Public Docket</p>
            <h2 id="live-cases-title">Live Cases</h2>
          </div>
          <div className="court-case-grid">
            {liveCases.map((courtCase) => (
              <CaseCard courtCase={courtCase} key={courtCase.id} />
            ))}
          </div>
        </section>

        <section className="court-section scroll-fade" aria-labelledby="recent-judgments-title">
          <div className="court-section__header">
            <p className="eyebrow">Issued Orders</p>
            <h2 id="recent-judgments-title">Recent Judgments</h2>
          </div>
          <div className="court-case-grid court-case-grid--compact">
            {judgments.length ? (
              judgments.map((courtCase) => <CaseCard courtCase={courtCase} key={courtCase.id} />)
            ) : (
              <p className="court-empty">No final judgments are currently published.</p>
            )}
          </div>
        </section>

        <section className="court-section scroll-fade" aria-labelledby="case-archive-title">
          <div className="court-section__header">
            <p className="eyebrow">Permanent Record</p>
            <h2 id="case-archive-title">Case Archive</h2>
          </div>
          <div className="court-archive-list">
            {archive.length ? (
              archive.map((courtCase) => (
                <Link href={`/supreme-court/${courtCase.id}`} key={courtCase.id}>
                  <span>{courtCase.caseNumber}</span>
                  <strong>{courtCase.title}</strong>
                  <em>{courtCase.status}</em>
                </Link>
              ))
            ) : (
              <p className="court-empty">No sealed or closed cases are available for public review.</p>
            )}
          </div>
        </section>

        <section className="court-section court-notices scroll-fade" aria-labelledby="court-notices-title">
          <div className="court-section__header">
            <p className="eyebrow">Official Registry</p>
            <h2 id="court-notices-title">Court Notices</h2>
          </div>
          <div className="court-notice-grid">
            <article>
              <span>Public Access</span>
              <p>All public case pages remain viewable without a case key unless marked sealed.</p>
            </article>
            <article>
              <span>Restricted Participation</span>
              <p>Defendants, witnesses, counsel, and officials must use a valid case access key.</p>
            </article>
            <article>
              <span>Official Record</span>
              <p>Formal submissions are recorded as court statements and reviewed by officials.</p>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
