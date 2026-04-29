import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import {
  mssClassifications,
  mssDistributions,
  mssThreatLevels,
  pingOptions
} from "../../../lib/discord-broadcasts";
import {
  enemyClassifications,
  enemyStatuses,
  enemyThreatLevels,
  enemyVisibilityLevels,
  getAllEnemyEntries
} from "../../../lib/enemies-of-state";

export const metadata = {
  title: "MSS Console | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MssConsolePage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("enemyRegistryDraft");
  const entries = await getAllEnemyEntries();
  const canIssuePublic = canAccess(user, "enemyRegistryPublic");
  const canCreateAlerts = canAccess(user, "mssTools");
  const visiblePingOptions = ["Supreme Chairman", "Executive Director", "MSS Command", "Security Command"].includes(user.role)
    ? pingOptions
    : pingOptions.filter((option) => option.value !== "everyone");

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
        {params?.saved ? (
          <section className="application-notice">
            <strong>Security Alert Queued</strong>
            <p>The MSS directive has been recorded for Discord delivery.</p>
          </section>
        ) : null}
        {params?.registrySaved ? (
          <section className="application-notice">
            <strong>Registry Updated</strong>
            <p>The Enemy of the State Registry has been recorded for authorised review.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Security Alert Not Sent</strong>
            <p>{params.detail || "The directive could not be queued."}</p>
          </section>
        ) : null}
        <section className="panel government-user-panel">
          <p className="eyebrow">Enemy of the State Registry</p>
          <h2>Create Registry Entry</h2>
          <p>
            Authenticated as {user.username} / {user.role}. MSS Agents may draft records;
            public registry approval is restricted to Supreme Chairman, Executive Director,
            MSS Command, and the Minister of State Security.
          </p>
          <form action="/government-access/mss-console/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="create-enemy-entry" />
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Name</span>
                <input name="name" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Alias</span>
                <input name="alias" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Classification</span>
                <select defaultValue="Person of Interest" name="classification">
                  {enemyClassifications.map((classification) => (
                    <option key={classification} value={classification}>{classification}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Threat level</span>
                <select defaultValue="Low" name="threatLevel">
                  {enemyThreatLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Status</span>
                <select defaultValue="Under MSS Review" name="status">
                  {enemyStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Visibility</span>
                <select defaultValue="MSS Only" name="visibility">
                  {enemyVisibilityLevels.map((visibility) => (
                    <option disabled={visibility === "Public Registry" && !canIssuePublic} key={visibility} value={visibility}>{visibility}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Date listed</span>
                <input defaultValue={new Date().toISOString().slice(0, 10)} name="dateListed" type="date" />
              </label>
              <label className="public-application-field">
                <span>Issuing authority</span>
                <input defaultValue="Ministry of State Security" name="issuingAuthority" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Discord ID</span>
                <input name="discordId" type="text" />
              </label>
              <label className="public-application-toggle">
                <input name="discordIdPublic" type="checkbox" />
                <span>Show Discord ID publicly</span>
              </label>
            </div>
            <label className="public-application-field">
              <span>Reason summary</span>
              <textarea name="reasonSummary" required rows="4" />
            </label>
            <label className="public-application-field">
              <span>Evidence notes</span>
              <textarea name="evidenceNotes" rows="4" />
            </label>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Supreme Court case link</span>
                <input name="relatedCaseUrl" type="text" />
              </label>
              <label className="public-application-field">
                <span>News article link</span>
                <input name="relatedArticleUrl" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Bulletin link</span>
                <input name="relatedBulletinUrl" type="text" />
              </label>
              <label className="public-application-field">
                <span>Image / portrait URL</span>
                <input name="imageUrl" type="text" />
              </label>
            </div>
            <button className="button button--solid-site" type="submit">
              Create Registry Entry
            </button>
          </form>
        </section>

        <section className="state-section">
          <p className="eyebrow">Registry Management</p>
          <h2>Enemy of the State Records</h2>
          <div className="enemy-admin-list">
            {entries.map((entry) => (
              <article className="panel government-user-card enemy-admin-card" key={entry.id}>
                <div className="enemy-admin-card__heading">
                  <div>
                    <p className="eyebrow">{entry.visibility}</p>
                    <h3>{entry.name}{entry.alias ? ` / ${entry.alias}` : ""}</h3>
                  </div>
                  <strong>{entry.classification} / {entry.threatLevel}</strong>
                </div>
                <form action="/government-access/mss-console/action" className="public-application-form" method="post">
                  <input name="intent" type="hidden" value="update-enemy-entry" />
                  <input name="entryId" type="hidden" value={entry.id} />
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Name</span>
                      <input defaultValue={entry.name} name="name" required type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Alias</span>
                      <input defaultValue={entry.alias} name="alias" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Discord ID</span>
                      <input defaultValue={entry.discordId} name="discordId" type="text" />
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Classification</span>
                      <select defaultValue={entry.classification} name="classification">
                        {enemyClassifications.map((classification) => (
                          <option key={classification} value={classification}>{classification}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Threat level</span>
                      <select defaultValue={entry.threatLevel} name="threatLevel">
                        {enemyThreatLevels.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Status</span>
                      <select defaultValue={entry.status} name="status">
                        {enemyStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Visibility</span>
                      <select defaultValue={entry.visibility} name="visibility">
                        {enemyVisibilityLevels.map((visibility) => (
                          <option disabled={visibility === "Public Registry" && !canIssuePublic} key={visibility} value={visibility}>{visibility}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Date listed</span>
                      <input defaultValue={entry.dateListed} name="dateListed" type="date" />
                    </label>
                    <label className="public-application-field">
                      <span>Issuing authority</span>
                      <input defaultValue={entry.issuingAuthority} name="issuingAuthority" type="text" />
                    </label>
                  </div>
                  <label className="public-application-field">
                    <span>Reason summary</span>
                    <textarea defaultValue={entry.reasonSummary} name="reasonSummary" required rows="3" />
                  </label>
                  <label className="public-application-field">
                    <span>Evidence notes</span>
                    <textarea defaultValue={entry.evidenceNotes} name="evidenceNotes" rows="3" />
                  </label>
                  <div className="public-application-grid public-application-grid--two">
                    <label className="public-application-field">
                      <span>Supreme Court case link</span>
                      <input defaultValue={entry.relatedCaseUrl} name="relatedCaseUrl" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>News article link</span>
                      <input defaultValue={entry.relatedArticleUrl} name="relatedArticleUrl" type="text" />
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--two">
                    <label className="public-application-field">
                      <span>Bulletin link</span>
                      <input defaultValue={entry.relatedBulletinUrl} name="relatedBulletinUrl" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Image / portrait URL</span>
                      <input defaultValue={entry.imageUrl} name="imageUrl" type="text" />
                    </label>
                  </div>
                  <label className="public-application-toggle">
                    <input defaultChecked={entry.discordIdPublic} name="discordIdPublic" type="checkbox" />
                    <span>Show Discord ID publicly</span>
                  </label>
                  <button className="button button--solid-site" type="submit">
                    Save Registry Entry
                  </button>
                </form>
                <form action="/government-access/mss-console/action" method="post">
                  <input name="intent" type="hidden" value="archive-enemy-entry" />
                  <input name="entryId" type="hidden" value={entry.id} />
                  <button className="button button--danger-site" type="submit">
                    Remove / Archive Entry
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        {canCreateAlerts ? (
        <section className="panel government-user-panel">
          <p className="eyebrow">MSS Command</p>
          <h2>Create Security Alert</h2>
          <p>
            Authenticated as {user.username} / {user.role}. Professional wording is required;
            alerts do not assert guilt unless the classification is explicitly Enemy of the State.
          </p>
          <form action="/government-access/mss-console/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="create-security-alert" />
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Subject name / username</span>
                <input name="subjectName" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Discord ID optional</span>
                <input name="targetDiscordId" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Classification</span>
                <select defaultValue="Person of Interest" name="classification">
                  {mssClassifications.map((classification) => (
                    <option key={classification} value={classification}>{classification}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Threat level</span>
                <select defaultValue="Low" name="threatLevel">
                  {mssThreatLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Distribution</span>
                <select defaultValue="mss_only" name="distribution">
                  {mssDistributions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Ping Options</span>
                <select defaultValue="none" name="pingOption">
                  {visiblePingOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="public-application-field">
              <span>Reason / summary</span>
              <textarea name="reason" required rows="5" />
            </label>
            <label className="public-application-field">
              <span>Evidence notes</span>
              <textarea name="evidenceNotes" rows="5" />
            </label>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-toggle">
                <input name="requiresApproval" type="checkbox" />
                <span>Requires approval</span>
              </label>
              <label className="public-application-toggle">
                <input name="confirmDiscordBroadcast" type="checkbox" />
                <span>Submit dangerous broadcast for Chairman approval</span>
              </label>
              <label className="public-application-toggle">
                <input name="confirmPingBroadcast" type="checkbox" />
                <span>Confirm Broadcast: You are about to send a message to all members.</span>
              </label>
            </div>
            <button className="button button--solid-site" type="submit">
              Create Security Alert
            </button>
          </form>
        </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
