import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";
import {
  mssClassifications,
  mssDistributions,
  mssThreatLevels
} from "../../../lib/discord-broadcasts";

export const metadata = {
  title: "MSS Console | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MssConsolePage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("mssTools");

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
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Security Alert Not Sent</strong>
            <p>{params.detail || "The directive could not be queued."}</p>
          </section>
        ) : null}
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
            </div>
            <button className="button button--solid-site" type="submit">
              Create Security Alert
            </button>
          </form>
        </section>
      </main>
    </SiteLayout>
  );
}
