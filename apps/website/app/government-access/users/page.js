import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { TemporaryPasswordNotice } from "../../../components/TemporaryPasswordNotice";
import {
  accessRoles,
  getGovernmentUsers,
  requireGovernmentUser
} from "../../../lib/government-auth";

export const metadata = {
  title: "User Control Panel | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GovernmentUserControlPage({ searchParams }) {
  await requireGovernmentUser("userControl");
  const params = await searchParams;
  const users = await getGovernmentUsers();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Identity Administration"
        title="User Control Panel"
        description="Manage Government Access accounts, roles, password resets, and status."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>

        <TemporaryPasswordNotice password={params?.temporaryPassword ? String(params.temporaryPassword) : ""} />

        {params?.saved ? (
          <section className="application-notice">
            <strong>User Register Updated</strong>
            <p>Account changes have been saved.</p>
          </section>
        ) : null}

        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">User Control Panel</p>
              <h2>Add User</h2>
            </div>
          </div>
          <form action="/government-access/users/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="create" />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Username</span>
                <input name="username" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Display Name</span>
                <input name="displayName" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Role</span>
                <select name="role">
                  {accessRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="public-application-field">
              <span>Temporary Password</span>
              <input name="temporaryPassword" placeholder="Leave blank to generate" type="text" />
              <small className="public-application-help">
                Stored as a hash only. The temporary password appears once after creation.
              </small>
            </label>
            <label className="public-application-toggle">
              <input defaultChecked name="forcePasswordChange" type="checkbox" />
              <span>Force password change on first login</span>
            </label>
            <label className="public-application-field">
              <span>Notes</span>
              <textarea name="notes" rows="3" />
            </label>
            <button className="button button--solid-site" type="submit">
              Add User
            </button>
          </form>
        </section>

        <section className="government-user-list" aria-label="Government users">
          {users.map((governmentUser) => (
            <article className="panel government-user-card" key={governmentUser.username}>
              <form action="/government-access/users/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="update" />
                <input name="username" type="hidden" value={governmentUser.username} />
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{governmentUser.username}</p>
                    <h2>{governmentUser.displayName}</h2>
                  </div>
                  <span className="court-role-badge">
                    {governmentUser.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="government-user-meta">
                  <span>Created: {governmentUser.createdAt}</span>
                  <span>Last Login: {governmentUser.lastLoginAt || "Never"}</span>
                  <span>Password hidden for security.</span>
                </div>
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field">
                    <span>Display Name</span>
                    <input defaultValue={governmentUser.displayName} name="displayName" required type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Role / Access Level</span>
                    <select defaultValue={governmentUser.role} name="role">
                      {accessRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="public-application-field">
                    <span>Account Status</span>
                    <input readOnly value={governmentUser.active ? "Active" : "Inactive"} />
                  </label>
                </div>
                <div className="public-application-grid">
                  <label className="public-application-toggle">
                    <input defaultChecked={governmentUser.active} name="active" type="checkbox" />
                    <span>Active account</span>
                  </label>
                  <label className="public-application-toggle">
                    <input defaultChecked={governmentUser.forcePasswordChange} name="forcePasswordChange" type="checkbox" />
                    <span>Force password change</span>
                  </label>
                </div>
                <label className="public-application-field">
                  <span>Notes</span>
                  <textarea defaultValue={governmentUser.notes} name="notes" rows="3" />
                </label>
                <div className="bulletin-editor-card__actions">
                  <button className="button button--solid-site" type="submit">
                    Edit User
                  </button>
                </div>
              </form>

              <div className="bulletin-editor-card__actions">
                <form action="/government-access/users/action" method="post">
                  <input name="intent" type="hidden" value="reset-password" />
                  <input name="username" type="hidden" value={governmentUser.username} />
                  <button className="button" type="submit">
                    Reset Password
                  </button>
                </form>
                <form action="/government-access/users/action" method="post">
                  <input name="intent" type="hidden" value="disable" />
                  <input name="username" type="hidden" value={governmentUser.username} />
                  <button className="button" disabled={!governmentUser.active} type="submit">
                    Disable User
                  </button>
                </form>
                <form action="/government-access/users/action" method="post">
                  <input name="intent" type="hidden" value="delete" />
                  <input name="username" type="hidden" value={governmentUser.username} />
                  <button className="button button--danger-site" type="submit">
                    Delete User
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      </main>
    </SiteLayout>
  );
}
