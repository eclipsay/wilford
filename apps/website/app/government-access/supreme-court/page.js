import Link from "next/link";
import { CourtIssuedKeyNotice } from "../../../components/CourtIssuedKeyNotice";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import {
  courtDiscordActions,
  courtKeyRoles,
  courtPetitionStatuses,
  courtPetitionTypes,
  courtStatuses,
  getCourtPetitions,
  hearingActionTypes,
  getSupremeCourtCases
} from "../../../lib/supreme-court";
import { requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "Supreme Court Control | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupremeCourtControlPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("supremeCourtControl");
  const cases = await getSupremeCourtCases({ includeRestricted: true });
  const petitions = await getCourtPetitions();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Judicial Administration"
        title="Supreme Court Control"
        description="Create cases, update the public docket, manage access keys, and review formal statements."
      />

      <main className="content content--wide portal-page bulletin-control-page court-control-page">
        {
          <>
            {params?.saved ? (
              <section className="application-notice">
                <strong>Supreme Court Register Updated</strong>
                <p>Case records, orders, evidence, or access authority have been saved.</p>
                {params?.broadcast ? (
                  <p className="public-application-help">Discord court notice queued for bot delivery.</p>
                ) : null}
              </section>
            ) : null}

            {params?.generated ? (
              <CourtIssuedKeyNotice accessKey={String(params.generated)} />
            ) : null}

            {params?.error === "storage" ? (
              <section className="application-notice application-notice--error">
                <strong>Supreme Court Storage Error</strong>
                <p>
                  Supreme Court changes could not be saved. Confirm the website
                  has API_URL and SUPREME_COURT_API_KEY, BULLETIN_API_KEY, or
                  ADMIN_API_KEY configured for the production API.
                </p>
                {params?.detail ? (
                  <p className="public-application-help">
                    API detail: {String(params.detail)}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="panel bulletin-control-panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Supreme Court Control</p>
                  <h2>Create Case</h2>
                  <p className="public-application-help">Authenticated as {user.username} / {user.role}</p>
                </div>
                <Link className="button" href="/government-access">Dashboard</Link>
              </div>
              <form action="/government-access/supreme-court/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="save-case" />
                <label className="public-application-field">
                  <span>Case Title</span>
                  <input name="title" required type="text" />
                </label>
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field">
                    <span>Case Number</span>
                    <input name="caseNumber" required type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Status</span>
                    <select name="status">
                      {courtStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="public-application-field">
                    <span>Date Opened</span>
                    <input name="dateOpened" required type="date" />
                  </label>
                </div>
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field">
                    <span>Hearing Date</span>
                    <input name="hearingDate" type="datetime-local" />
                  </label>
                  <label className="public-application-field">
                    <span>Classification</span>
                    <input defaultValue="Public Judicial Notice" name="classification" type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Discord Posting</span>
                    <select name="discordAction">
                      {courtDiscordActions.map((action) => (
                        <option key={action.value} value={action.value}>{action.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="public-application-field">
                  <span>Courtroom</span>
                  <input name="courtroom" required type="text" />
                </label>
                <label className="public-application-field">
                  <span>Judge / Presiding Official</span>
                  <input name="presidingOfficial" required type="text" />
                </label>
                <label className="public-application-field">
                  <span>Defendant / Respondent</span>
                  <input name="defendant" type="text" />
                </label>
                <label className="public-application-field">
                  <span>Charges</span>
                  <textarea name="charges" placeholder="One charge per line" rows="3" />
                </label>
                <label className="public-application-field">
                  <span>Parties</span>
                  <textarea name="parties" placeholder="One party per line" rows="3" />
                </label>
                <label className="public-application-field">
                  <span>Summary</span>
                  <textarea name="summary" required rows="4" />
                </label>
                <label className="public-application-field">
                  <span>Public Notes</span>
                  <textarea name="publicNotes" rows="4" />
                </label>
                <label className="public-application-field">
                  <span>Court Statement for Discord</span>
                  <textarea name="courtStatement" rows="3" />
                </label>
                <button className="button button--solid-site" type="submit">
                  Create Case
                </button>
              </form>
            </section>

            <section className="court-control-list" aria-label="Supreme Court case editor">
              {cases.map((courtCase) => (
                <article className="panel bulletin-editor-card court-control-card" key={courtCase.id}>
                  <form action="/government-access/supreme-court/action" className="public-application-form" method="post">
                    <input name="intent" type="hidden" value="save-case" />
                    <input name="id" type="hidden" value={courtCase.id} />
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">{courtCase.caseNumber}</p>
                        <h2>{courtCase.title}</h2>
                      </div>
                      <Link className="button" href={`/supreme-court/${courtCase.id}`}>
                        Public Page
                      </Link>
                    </div>
                    <label className="public-application-field">
                      <span>Case Title</span>
                      <input defaultValue={courtCase.title} name="title" required type="text" />
                    </label>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field">
                        <span>Case Number</span>
                        <input defaultValue={courtCase.caseNumber} name="caseNumber" required type="text" />
                      </label>
                      <label className="public-application-field">
                        <span>Status</span>
                        <select defaultValue={courtCase.status} name="status">
                          {courtStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="public-application-field">
                        <span>Date Opened</span>
                        <input defaultValue={courtCase.dateOpened} name="dateOpened" required type="date" />
                      </label>
                    </div>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field">
                        <span>Hearing Date</span>
                        <input defaultValue={courtCase.hearingDate} name="hearingDate" type="datetime-local" />
                      </label>
                      <label className="public-application-field">
                        <span>Classification</span>
                        <input defaultValue={courtCase.classification} name="classification" type="text" />
                      </label>
                      <label className="public-application-field">
                        <span>Discord Posting</span>
                        <select name="discordAction">
                          {courtDiscordActions.map((action) => (
                            <option key={action.value} value={action.value}>{action.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="public-application-field">
                      <span>Courtroom</span>
                      <input defaultValue={courtCase.courtroom} name="courtroom" required type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Judge / Presiding Official</span>
                      <input defaultValue={courtCase.presidingOfficial} name="presidingOfficial" required type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Defendant / Respondent</span>
                      <input defaultValue={courtCase.defendant} name="defendant" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Charges</span>
                      <textarea defaultValue={courtCase.charges.join("\n")} name="charges" rows="3" />
                    </label>
                    <label className="public-application-field">
                      <span>Parties</span>
                      <textarea defaultValue={courtCase.parties.join("\n")} name="parties" rows="3" />
                    </label>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field">
                        <span>Verdict</span>
                        <input defaultValue={courtCase.verdict} name="verdict" type="text" />
                      </label>
                      <label className="public-application-field">
                        <span>Sentence</span>
                        <input defaultValue={courtCase.sentence} name="sentence" type="text" />
                      </label>
                      <label className="public-application-field court-checkbox-field">
                        <span>Force Discord Repost</span>
                        <input name="forceDiscordBroadcast" type="checkbox" />
                      </label>
                    </div>
                    <label className="public-application-field">
                      <span>Summary</span>
                      <textarea defaultValue={courtCase.summary} name="summary" required rows="4" />
                    </label>
                    <label className="public-application-field">
                      <span>Public Notes</span>
                      <textarea defaultValue={courtCase.publicNotes} name="publicNotes" rows="4" />
                    </label>
                    <label className="public-application-field">
                      <span>Court Statement for Discord</span>
                      <textarea name="courtStatement" rows="3" />
                    </label>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field">
                        <span>Hearing Action</span>
                        <select name="hearingAction">
                          <option value="">No hearing action</option>
                          {hearingActionTypes.map((action) => (
                            <option key={action} value={action}>{action}</option>
                          ))}
                        </select>
                      </label>
                      <label className="public-application-field">
                        <span>Clemency Person</span>
                        <input defaultValue={courtCase.clemency?.person || courtCase.defendant} name="clemencyPerson" type="text" />
                      </label>
                      <label className="public-application-field">
                        <span>Clemency Type</span>
                        <select defaultValue={courtCase.clemency?.type || "pardon"} name="clemencyType">
                          <option value="pardon">pardon</option>
                          <option value="sentence reduction">sentence reduction</option>
                          <option value="restoration of citizenship">restoration of citizenship</option>
                          <option value="warning replaced sentence">warning replaced sentence</option>
                        </select>
                      </label>
                    </div>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field">
                        <span>Clemency Issued By</span>
                        <input defaultValue={courtCase.clemency?.issuedBy} name="clemencyIssuedBy" type="text" />
                      </label>
                      <label className="public-application-field">
                        <span>Clemency Statement</span>
                        <input defaultValue={courtCase.clemency?.statement} name="clemencyStatement" type="text" />
                      </label>
                    </div>
                    <details className="court-discord-receipts">
                      <summary>Discord court records</summary>
                      <dl className="court-docket-grid">
                        <div><dt>Announcement</dt><dd>{courtCase.courtAnnouncementMessageId || "Not queued"}</dd></div>
                        <div><dt>Active Hearing</dt><dd>{courtCase.activeHearingMessageId || "Not queued"}</dd></div>
                        <div><dt>Verdict</dt><dd>{courtCase.verdictMessageId || "Not queued"}</dd></div>
                        <div><dt>Archive</dt><dd>{courtCase.archiveMessageId || "Not queued"}</dd></div>
                        <div><dt>Clemency</dt><dd>{courtCase.clemencyMessageId || "Not queued"}</dd></div>
                      </dl>
                    </details>
                    <button className="button button--solid-site" type="submit">
                      Edit Case
                    </button>
                  </form>

                  <div className="court-control-tools">
                    <form action="/government-access/supreme-court/action" className="public-application-form" method="post">
                      <input name="intent" type="hidden" value="add-timeline" />
                      <input name="id" type="hidden" value={courtCase.id} />
                      <h3>Add Timeline Update</h3>
                      <div className="public-application-grid public-application-grid--three">
                        <label className="public-application-field">
                          <span>Date / Time</span>
                          <input name="date" required type="text" />
                        </label>
                        <label className="public-application-field">
                          <span>Title</span>
                          <input name="title" required type="text" />
                        </label>
                        <label className="public-application-field">
                          <span>Update</span>
                          <input name="text" required type="text" />
                        </label>
                      </div>
                      <label className="public-application-field">
                        <span>Discord Posting</span>
                        <select name="discordAction" defaultValue="none">
                          <option value="none">Do not post to Discord</option>
                          <option value="court_announcement">Post to Court Announcements</option>
                          <option value="active_hearing">Post to Active Hearings</option>
                        </select>
                      </label>
                      <button className="button" type="submit">Add Timeline Update</button>
                    </form>

                    <div className="court-inline-forms">
                      {[
                        ["add-ruling", "Add Ruling/Order"],
                        ["add-party", "Add Party"],
                        ["add-evidence", "Add Evidence Item"]
                      ].map(([intent, label]) => (
                        <form action="/government-access/supreme-court/action" className="public-application-form" key={intent} method="post">
                          <input name="intent" type="hidden" value={intent} />
                          <input name="id" type="hidden" value={courtCase.id} />
                          <label className="public-application-field">
                            <span>{label}</span>
                            <input name="text" required type="text" />
                          </label>
                          <label className="public-application-field">
                            <span>Discord Posting</span>
                            <select name="discordAction" defaultValue="none">
                              <option value="none">Do not post to Discord</option>
                              <option value={intent === "add-evidence" ? "active_hearing" : "court_announcement"}>
                                {intent === "add-evidence" ? "Post to Active Hearings" : "Post to Court Announcements"}
                              </option>
                              <option value="legal_archive">Post to Legal Archives</option>
                            </select>
                          </label>
                          <button className="button" type="submit">{label}</button>
                        </form>
                      ))}
                    </div>

                    <form action="/government-access/supreme-court/action" className="public-application-form court-key-form" method="post">
                      <input name="intent" type="hidden" value="set-key" />
                      <input name="id" type="hidden" value={courtCase.id} />
                      <div className="public-application-grid public-application-grid--three">
                        <label className="public-application-field">
                          <span>Set Key Role</span>
                          <select name="role">
                            {courtKeyRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="public-application-field">
                          <span>Generate or Change Access Key</span>
                          <input name="accessKey" placeholder="Leave blank to generate" type="text" />
                          <small className="public-application-help">
                            The issued key appears at the top of this control panel after saving.
                          </small>
                        </label>
                      </div>
                      <button className="button button--solid-site" type="submit">
                        Generate / Change Key
                      </button>
                    </form>

                    <div className="court-key-list">
                      {courtCase.accessKeys.map((accessKey) => (
                        <form action="/government-access/supreme-court/action" key={accessKey.id} method="post">
                          <input name="intent" type="hidden" value="revoke-key" />
                          <input name="id" type="hidden" value={courtCase.id} />
                          <input name="keyId" type="hidden" value={accessKey.id} />
                          <span>{accessKey.role}</span>
                          <strong>{accessKey.active ? "Active" : "Revoked"}</strong>
                          <button className="button button--danger-site" disabled={!accessKey.active} type="submit">
                            Disable / Revoke Key
                          </button>
                        </form>
                      ))}
                    </div>

                    <section className="court-statement-ledger">
                      <h3>Submitted Statements</h3>
                      {courtCase.statements.length ? (
                        courtCase.statements.map((statement) => (
                          <article key={statement.id}>
                            <span>{statement.role} / {statement.submittedAt}</span>
                            <p>{statement.text}</p>
                          </article>
                        ))
                      ) : (
                        <p className="court-empty">No formal statements submitted.</p>
                      )}
                    </section>

                    <div className="bulletin-editor-card__actions">
                      <form action="/government-access/supreme-court/action" method="post">
                        <input name="intent" type="hidden" value="archive-case" />
                        <input name="id" type="hidden" value={courtCase.id} />
                        <input name="discordAction" type="hidden" value="legal_archive" />
                        <button className="button" type="submit">Delete / Archive Case</button>
                      </form>
                      <form action="/government-access/supreme-court/action" method="post">
                        <input name="intent" type="hidden" value="delete-case" />
                        <input name="id" type="hidden" value={courtCase.id} />
                        <button className="button button--danger-site" type="submit">Delete Case</button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="panel bulletin-control-panel" id="court-petitions">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Supreme Court Registry</p>
                  <h2>Court Petitions</h2>
                </div>
              </div>
              <form action="/government-access/supreme-court/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="create-petition" />
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field">
                    <span>Petitioner</span>
                    <input name="petitionerName" required type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Discord ID</span>
                    <input name="petitionerDiscordId" type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Request Type</span>
                    <select name="requestType">
                      {courtPetitionTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="public-application-field">
                  <span>Subject</span>
                  <input name="subject" required type="text" />
                </label>
                <label className="public-application-field">
                  <span>Statement</span>
                  <textarea name="statement" required rows="4" />
                </label>
                <button className="button button--solid-site" type="submit">File Petition</button>
              </form>
              <div className="court-petition-list">
                {petitions.map((petition) => (
                  <article className="court-petition-card" key={petition.id}>
                    <form action="/government-access/supreme-court/action" className="public-application-form" method="post">
                      <input name="intent" type="hidden" value="update-petition" />
                      <input name="petitionId" type="hidden" value={petition.id} />
                      <div className="panel__header">
                        <div>
                          <p className="eyebrow">{petition.requestType} / {petition.status}</p>
                          <h3>{petition.subject}</h3>
                        </div>
                      </div>
                      <p className="public-application-help">
                        {petition.petitionerName || "Unknown petitioner"} / {petition.petitionerDiscordId || "No Discord ID"} / {petition.submittedAt}
                      </p>
                      <p>{petition.statement}</p>
                      <label className="public-application-field">
                        <span>Status</span>
                        <select defaultValue={petition.status} name="status">
                          {courtPetitionStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="public-application-field">
                        <span>Internal Notes</span>
                        <textarea defaultValue={petition.internalNotes} name="internalNotes" rows="3" />
                      </label>
                      <button className="button" type="submit">Update Petition</button>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          </>
        }
      </main>
    </SiteLayout>
  );
}
