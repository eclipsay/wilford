import Link from "next/link";
import {
  applicationStatuses,
  formatApplicationStatus,
  getCitizenApplications
} from "../../../lib/citizen-applications";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "Citizen Applications | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function CitizenshipReviewPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("citizenshipReview");
  const applications = await getCitizenApplications();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Civic Intake"
        title="Citizen Applications"
        description="Review public citizenship petitions, applicant answers, status, and internal notes."
      />

      <main className="content content--wide portal-page government-command-page citizen-review-page">
        <div className="sort-row">
          <Link className="button" href="/government-access">
            Back to Dashboard
          </Link>
        </div>

        {params?.saved ? (
          <section className="application-notice">
            <strong>Application Updated</strong>
            <p>Review status and notes have been saved.</p>
          </section>
        ) : null}

        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Application Storage Error</strong>
            <p>Application changes could not be saved.</p>
            {params?.detail ? (
              <p className="public-application-help">API detail: {String(params.detail)}</p>
            ) : null}
          </section>
        ) : null}

        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Citizenship Applications</p>
              <h2>Review Queue</h2>
              <p className="public-application-help">Authenticated as {user.username} / {user.role}</p>
            </div>
            <strong className="citizen-review-count">{applications.length} records</strong>
          </div>
        </section>

        <section className="citizen-application-list" aria-label="Citizen application records">
          {applications.length ? (
            applications.map((application) => (
              <article className={`panel citizen-application-card citizen-application-card--${application.status}`} key={application.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{application.source} / {formatDate(application.submittedAt)}</p>
                    <h2>{application.applicantName}</h2>
                    <p className="public-application-help">
                      Updated {formatDate(application.updatedAt)}
                    </p>
                  </div>
                  <div className="bulletin-editor-card__status">
                    <span>Application Status</span>
                    <strong>{formatApplicationStatus(application.status)}</strong>
                  </div>
                </div>

                <dl className="citizen-application-details">
                  <div>
                    <dt>Age</dt>
                    <dd>{application.age}</dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{application.timezone}</dd>
                  </div>
                  <div>
                    <dt>Discord</dt>
                    <dd>{application.discordHandle}</dd>
                  </div>
                  <div>
                    <dt>Discord ID</dt>
                    <dd>{application.discordUserId || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{application.email || "Not provided"}</dd>
                  </div>
                </dl>

                <div className="citizen-application-answers">
                  <section>
                    <p className="eyebrow">Motivation</p>
                    <p>{application.motivation}</p>
                  </section>
                  <section>
                    <p className="eyebrow">Skills / Service</p>
                    <p>{application.experience}</p>
                  </section>
                </div>

                <form action="/government-access/citizenship/action" className="public-application-form" method="post">
                  <input name="id" type="hidden" value={application.id} />
                  <div className="public-application-grid">
                    <label className="public-application-field">
                      <span>Status</span>
                      <select defaultValue={application.status} name="status">
                        {applicationStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatApplicationStatus(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Decision Note</span>
                      <input defaultValue={application.decisionNote} name="decisionNote" type="text" />
                    </label>
                  </div>
                  <label className="public-application-field">
                    <span>Internal Notes</span>
                    <textarea defaultValue={application.internalNotes} name="internalNotes" rows="5" />
                  </label>
                  <button className="button button--solid-site" type="submit">
                    Save Review
                  </button>
                </form>
              </article>
            ))
          ) : (
            <section className="panel bulletin-restricted-panel">
              <p className="eyebrow">No Active Intake Records</p>
              <h2>No citizenship applications have been submitted.</h2>
            </section>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
