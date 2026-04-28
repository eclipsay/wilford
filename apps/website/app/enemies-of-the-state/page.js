import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import {
  enemyClassifications,
  enemyThreatLevels,
  getPublicEnemyEntries
} from "../../lib/enemies-of-state";

export const metadata = {
  title: "Enemies of the State Registry"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value || "Date not entered";
  }
}

function referenceLinks(entry) {
  return [
    ["Supreme Court Case", entry.relatedCaseUrl],
    ["News Article", entry.relatedArticleUrl],
    ["Bulletin", entry.relatedBulletinUrl]
  ].filter(([, href]) => href);
}

export default async function EnemiesOfTheStatePage({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || "").trim().toLowerCase();
  const threat = String(params?.threat || "").trim();
  const classification = String(params?.classification || "").trim();
  const archive = String(params?.archive || "") === "cleared";
  const entries = await getPublicEnemyEntries();
  const visibleEntries = entries.filter((entry) => {
    const cleared = ["Pardoned", "Cleared"].includes(entry.status) || entry.classification === "Pardoned / Cleared";
    const matchesArchive = archive ? cleared : !cleared;
    const matchesQuery = !query || `${entry.name} ${entry.alias}`.toLowerCase().includes(query);
    const matchesThreat = !threat || entry.threatLevel === threat;
    const matchesClassification = !classification || entry.classification === classification;
    return matchesArchive && matchesQuery && matchesThreat && matchesClassification;
  });

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of State Security"
        title="Enemies Of The State"
        description="Official public registry of persons classified under MSS authority."
      />

      <main className="content content--wide enemy-registry-page">
        <section className="restricted-banner restricted-banner--mss">
          <span>Public Registry Notice</span>
          <strong>Entries shown here are listed by order of authorised state authority.</strong>
          <p>
            Active records indicate persons classified as security concerns or enemies of the state.
            Archive records indicate persons cleared by order of the issuing authority.
          </p>
        </section>

        <form className="enemy-registry-filters" action="/enemies-of-the-state" method="get">
          <label className="public-application-field">
            <span>Search registry</span>
            <input defaultValue={params?.q || ""} name="q" placeholder="Name or alias" type="search" />
          </label>
          <label className="public-application-field">
            <span>Threat level</span>
            <select defaultValue={threat} name="threat">
              <option value="">All threat levels</option>
              {enemyThreatLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="public-application-field">
            <span>Classification</span>
            <select defaultValue={classification} name="classification">
              <option value="">All classifications</option>
              {enemyClassifications.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="public-application-field">
            <span>Registry view</span>
            <select defaultValue={archive ? "cleared" : ""} name="archive">
              <option value="">Active enemies</option>
              <option value="cleared">Cleared / pardoned archive</option>
            </select>
          </label>
          <button className="button button--solid-site" type="submit">Filter Registry</button>
        </form>

        <section className="enemy-registry-grid" aria-label="Public enemy registry">
          {visibleEntries.length ? (
            visibleEntries.map((entry) => (
              <article
                className={`enemy-registry-card ${entry.imageUrl ? "" : "enemy-registry-card--no-image"}`}
                key={entry.id}
              >
                {entry.imageUrl ? (
                  <img
                    className="enemy-registry-card__image"
                    src={entry.imageUrl}
                    alt=""
                  />
                ) : null}
                <div className="enemy-registry-card__body">
                  <div className="enemy-registry-card__heading">
                    <p className="eyebrow">{entry.classification}</p>
                    <h2>{entry.name}</h2>
                    {entry.alias ? <strong>Alias: {entry.alias}</strong> : null}
                  </div>
                  <dl className="enemy-registry-details">
                    {entry.discordIdPublic && entry.discordId ? (
                      <div>
                        <dt>Discord ID</dt>
                        <dd>{entry.discordId}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Threat Level</dt>
                      <dd>{entry.threatLevel}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{entry.status}</dd>
                    </div>
                    <div>
                      <dt>Date Listed</dt>
                      <dd>{formatDate(entry.dateListed)}</dd>
                    </div>
                    <div>
                      <dt>Issuing Authority</dt>
                      <dd>{entry.issuingAuthority}</dd>
                    </div>
                  </dl>
                  <p className="enemy-registry-reason">
                    {entry.status === "Cleared" || entry.status === "Pardoned"
                      ? `${entry.name} has been cleared by order of ${entry.issuingAuthority}. ${entry.reasonSummary}`
                      : `${entry.name} is classified as ${entry.classification} and listed by order of ${entry.issuingAuthority}. ${entry.reasonSummary}`}
                  </p>
                  {referenceLinks(entry).length ? (
                    <div className="enemy-registry-links">
                      {referenceLinks(entry).map(([label, href]) => (
                        <Link className="button" href={href} key={label}>{label}</Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <section className="application-notice">
              <strong>No Public Records Found</strong>
              <p>No public registry entries match the current filters.</p>
            </section>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
