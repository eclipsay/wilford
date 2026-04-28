import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";
import {
  assignedMinistries,
  getCitizenState,
  requestCategories,
  requestPriorities,
  requestStatuses
} from "../../../lib/citizen-state";

export const metadata = {
  title: "Citizen Requests Control | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function matches(value, filter) {
  return !filter || value === filter;
}

export default async function CitizenRequestsControlPage({ searchParams }) {
  const params = await searchParams;
  await requireGovernmentUser("citizenRequestControl");
  const state = await getCitizenState();
  const districts = [...new Set(state.citizenRecords.map((record) => record.district).filter(Boolean))];
  const requests = state.citizenRequests.filter((request) =>
    matches(request.category, params?.category) &&
    matches(request.status, params?.status) &&
    matches(request.district, params?.district) &&
    matches(request.priority, params?.priority)
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Citizen Services"
        title="Citizen Requests Control"
        description="Review, assign, respond, escalate, and close citizen requests across ministries and districts."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>
        {params?.saved ? <section className="application-notice"><strong>Request Updated</strong><p>The citizen request record has been saved.</p></section> : null}

        <section className="panel public-application-form">
          <p className="eyebrow">Filters</p>
          <h2>Request Queue</h2>
          <form action="/government-access/citizen-requests" className="public-application-grid public-application-grid--three" method="get">
            <label className="public-application-field"><span>Category</span><select name="category" defaultValue={params?.category || ""}><option value="">All</option>{requestCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="public-application-field"><span>Status</span><select name="status" defaultValue={params?.status || ""}><option value="">All</option>{requestStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="public-application-field"><span>District</span><select name="district" defaultValue={params?.district || ""}><option value="">All</option>{districts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="public-application-field"><span>Priority</span><select name="priority" defaultValue={params?.priority || ""}><option value="">All</option>{requestPriorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button className="button button--solid-site" type="submit">Apply Filters</button>
          </form>
        </section>

        <section className="government-dashboard-grid">
          <article className="government-status-panel"><p className="eyebrow">Total Requests</p><h2>{state.citizenRequests.length}</h2><p>All citizen service cases.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Under Review</p><h2>{state.citizenRequests.filter((request) => request.status === "Under Review").length}</h2><p>Open ministry reviews.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Urgent</p><h2>{state.citizenRequests.filter((request) => request.priority === "Urgent").length}</h2><p>Immediate attention queue.</p></article>
          <article className="government-status-panel"><p className="eyebrow">MSS Escalations</p><h2>{state.citizenRequests.filter((request) => request.escalation.includes("MSS")).length}</h2><p>Security-linked requests.</p></article>
        </section>

        <section className="state-section">
          <p className="eyebrow">Control Queue</p>
          <h2>Citizen Requests</h2>
          <div className="government-user-list">
            {requests.map((request) => {
              const citizen = state.citizenRecords.find((record) => record.id === request.citizenId);
              return (
                <article className="panel government-user-card" key={request.id}>
                  <div className="panel__header">
                    <div>
                      <p className="eyebrow">{request.id} / {request.district}</p>
                      <h2>{request.category}</h2>
                    </div>
                    <span className="court-role-badge">{request.status}</span>
                  </div>
                  <p>{request.message}</p>
                  <div className="metric-grid">
                    <span><strong>{request.citizenName}</strong> Citizen</span>
                    <span><strong>{request.priority}</strong> Priority</span>
                    <span><strong>{request.assignedMinistry}</strong> Ministry</span>
                    <span><strong>{request.createdAt.slice(0, 10)}</strong> Created</span>
                    <span><strong>{request.escalation || "None"}</strong> Escalation</span>
                    <span><strong>{citizen?.unionSecurityId || "Unlinked"}</strong> Citizen ID</span>
                  </div>
                  <form action="/government-access/citizen-requests/action" className="public-application-form" method="post">
                    <input name="requestId" type="hidden" value={request.id} />
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field"><span>Status</span><select defaultValue={request.status} name="status">{requestStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <label className="public-application-field"><span>Assigned ministry</span><select defaultValue={request.assignedMinistry} name="assignedMinistry">{assignedMinistries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                      <label className="public-application-field"><span>Escalation</span><select defaultValue={request.escalation || ""} name="escalation"><option value="">None</option><option value="MSS">MSS</option><option value="Supreme Court">Supreme Court</option><option value="Ministry of Credit & Records">Ministry of Credit & Records</option></select></label>
                    </div>
                    <label className="public-application-field"><span>Internal notes</span><textarea defaultValue={request.governmentNotes} name="governmentNotes" rows="3" /></label>
                    <label className="public-application-field"><span>Response to citizen</span><textarea defaultValue={request.citizenResponse} name="citizenResponse" rows="3" /></label>
                    <div className="bulletin-editor-card__actions">
                      <button className="button button--solid-site" name="intent" type="submit" value="save">Save Request</button>
                      <button className="button" name="intent" type="submit" value="close">Close Request</button>
                      {citizen ? <Link className="button" href={`/government-access/union-security-registry?citizen=${encodeURIComponent(citizen.id)}`}>Citizen Profile</Link> : null}
                    </div>
                  </form>
                </article>
              );
            })}
            {requests.length ? null : <article className="panel"><h3>No requests match the current filters.</h3></article>}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
