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

const activeStatuses = ["pending", "under_review", "appealed"];
const filters = ["active", "pending", "under_review", "appealed", "approved", "rejected", "archived", "all"];

function applicationMatchesFilter(application, filter) {
  if (!filter || filter === "all") {
    return true;
  }

  if (filter === "active") {
    return activeStatuses.includes(application.status) && !application.archived;
  }

  if (filter === "archived") {
    return application.archived || application.status === "archived";
  }

  return application.status === filter && !application.archived;
}

function sortApplications(applications, sort) {
  return [...applications].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    }

    if (sort === "status") {
      return String(a.status).localeCompare(String(b.status));
    }

    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });
}

export default async function CitizenshipReviewPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("citizenshipReview");
  const applications = await getCitizenApplications();
  const activeFilter = String(params?.filter || "active").trim();
  const search = String(params?.q || "").trim().toLowerCase();
  const sort = String(params?.sort || "newest").trim();
  const visibleApplications = sortApplications(
    applications.filter((application) => {
      const haystack = [
        application.applicantName,
        application.discordHandle,
        application.discordUserId,
        application.id
      ]
        .join(" ")
        .toLowerCase();
      return applicationMatchesFilter(application, activeFilter) && (!search || haystack.includes(search));
    }),
    sort
  );
  const counts = Object.fromEntries(
    filters.map((filter) => [
      filter,
      applications.filter((application) => applicationMatchesFilter(application, filter)).length
    ])
  );

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
            <p>{params?.error === "invalid-discord-id" ? "Valid Discord User ID is required to apply for citizenship." : "Application changes could not be saved."}</p>
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
            <strong className="citizen-review-count">{visibleApplications.length} / {applications.length} records</strong>
          </div>
          <form className="citizen-application-toolbar" method="get">
            <label className="public-application-field">
              <span>Search</span>
              <input defaultValue={search} name="q" placeholder="Name, Discord ID, application ID" type="search" />
            </label>
            <label className="public-application-field">
              <span>Sort</span>
              <select defaultValue={sort} name="sort">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="status">Status</option>
              </select>
            </label>
            <button className="button button--solid-site" type="submit">Apply</button>
          </form>
          <nav className="citizen-application-tabs" aria-label="Application status filters">
            {filters.map((filter) => (
              <Link
                className={`citizen-application-tab${activeFilter === filter ? " citizen-application-tab--active" : ""}`}
                href={`/government-access/citizenship?filter=${filter}${search ? `&q=${encodeURIComponent(search)}` : ""}&sort=${sort}`}
                key={filter}
              >
                {filter === "all" ? "All" : filter === "active" ? "Active" : formatApplicationStatus(filter)}
                <span>{counts[filter] || 0}</span>
              </Link>
            ))}
          </nav>
          <form action="/government-access/citizenship/action" method="post">
            <input name="id" type="hidden" value="__bulk__" />
            <input name="intent" type="hidden" value="bulk_archive" />
            <button className="button" type="submit">
              Bulk Archive Approved/Rejected
            </button>
          </form>
        </section>

        <section className="citizen-application-list" aria-label="Citizen application records">
          {visibleApplications.length ? (
            visibleApplications.map((application) => (
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
                <div className="citizen-application-badges">
                  {application.needsAttention ? <span>Needs Attention</span> : null}
                  {application.status === "appealed" || application.appealReason ? <span>Appeal Requested</span> : null}
                  {application.archived ? <span>Archived</span> : null}
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
                    <dd>
                      {application.discordUserId || "Not provided"}
                      {application.discordUserId ? (
                        <>
                          {" / "}
                          <a href={`https://discord.com/users/${application.discordUserId}`}>Open Discord Profile</a>
                        </>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{application.email || "Not provided"}</dd>
                  </div>
                </dl>

                <details className="citizen-application-answers" open={!["approved", "rejected", "archived"].includes(application.status)}>
                  <summary>Application answers</summary>
                  <section>
                    <p className="eyebrow">Motivation</p>
                    <p>{application.motivation}</p>
                  </section>
                  <section>
                    <p className="eyebrow">Skills / Service</p>
                    <p>{application.experience}</p>
                  </section>
                </details>

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
                    <label className="public-application-field">
                      <span>Discord User ID</span>
                      <input defaultValue={application.discordUserId} inputMode="numeric" maxLength={20} minLength={17} name="discordUserId" pattern="\d{17,20}" required type="text" />
                      <small className="public-application-help">Copy Discord ID for bot linking, DMs, economy identity, and role assignment.</small>
                    </label>
                  </div>
                  <label className="public-application-field">
                    <span>Internal Notes</span>
                    <textarea defaultValue={application.internalNotes} name="internalNotes" rows="5" />
                  </label>
                  <button className="button button--solid-site" type="submit">
                    Save Review
                  </button>
                  {application.status === "approved" ? (
                    <button className="button" name="intent" type="submit" value="resend_login">
                      Resend Citizen Login
                    </button>
                  ) : null}
                  <Link className="button" href={`/government-access/citizenship/${application.id}`}>
                    Open Detail
                  </Link>
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
