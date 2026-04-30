import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PanelShell } from "../../components/PanelShell";
import { getSession, requireAdmin } from "../../lib/auth";
import {
  accessRoles,
  createGovernmentUserFromPanel,
  deleteGovernmentUserFromPanel,
  disableGovernmentUserFromPanel,
  getGovernmentAdminSnapshot,
  resetGovernmentUserPasswordFromPanel,
  updateGovernmentUserFromPanel
} from "../../lib/government-users";

function normalizeFormBoolean(formData, name) {
  return formData.get(name) === "on";
}

async function createGovernmentUserAction(formData) {
  "use server";

  const session = await requireAdmin();
  const snapshot = await getGovernmentAdminSnapshot();

  try {
    const temporaryPassword = await createGovernmentUserFromPanel(snapshot, session.username, {
      username: String(formData.get("username") || "").trim(),
      displayName: String(formData.get("displayName") || "").trim(),
      role: String(formData.get("role") || "Citizen").trim(),
      assignedDistrict: String(formData.get("assignedDistrict") || "").trim(),
      temporaryPassword: String(formData.get("temporaryPassword") || "").trim(),
      forcePasswordChange: normalizeFormBoolean(formData, "forcePasswordChange"),
      notes: String(formData.get("notes") || "").trim()
    });

    revalidatePath("/government-users");
    redirect(
      `/government-users?saved=create&temporaryPassword=${encodeURIComponent(
        temporaryPassword
      )}`
    );
  } catch (error) {
    redirect(
      `/government-users?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Government user create failed."
      )}`
    );
  }
}

async function updateGovernmentUserAction(formData) {
  "use server";

  const session = await requireAdmin();
  const snapshot = await getGovernmentAdminSnapshot();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
    await updateGovernmentUserFromPanel(snapshot, session.username, username, {
      displayName: String(formData.get("displayName") || "").trim(),
      role: String(formData.get("role") || "Citizen").trim(),
      assignedDistrict: String(formData.get("assignedDistrict") || "").trim(),
      active: normalizeFormBoolean(formData, "active"),
      forcePasswordChange: normalizeFormBoolean(formData, "forcePasswordChange"),
      notes: String(formData.get("notes") || "").trim()
    });

    revalidatePath("/government-users");
    redirect("/government-users?saved=update");
  } catch (error) {
    redirect(
      `/government-users?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Government user update failed."
      )}`
    );
  }
}

async function resetGovernmentUserPasswordAction(formData) {
  "use server";

  const session = await requireAdmin();
  const snapshot = await getGovernmentAdminSnapshot();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
    const temporaryPassword = await resetGovernmentUserPasswordFromPanel(
      snapshot,
      session.username,
      username
    );

    revalidatePath("/government-users");
    redirect(
      `/government-users?saved=reset&temporaryPassword=${encodeURIComponent(
        temporaryPassword
      )}`
    );
  } catch (error) {
    redirect(
      `/government-users?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Password reset failed."
      )}`
    );
  }
}

async function disableGovernmentUserAction(formData) {
  "use server";

  const session = await requireAdmin();
  const snapshot = await getGovernmentAdminSnapshot();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
    await disableGovernmentUserFromPanel(snapshot, session.username, username);
    revalidatePath("/government-users");
    redirect("/government-users?saved=disable");
  } catch (error) {
    redirect(
      `/government-users?error=${encodeURIComponent(
        error instanceof Error ? error.message : "User disable failed."
      )}`
    );
  }
}

async function deleteGovernmentUserAction(formData) {
  "use server";

  const session = await requireAdmin();
  const snapshot = await getGovernmentAdminSnapshot();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
    await deleteGovernmentUserFromPanel(snapshot, session.username, username);
    revalidatePath("/government-users");
    redirect("/government-users?saved=delete");
  } catch (error) {
    redirect(
      `/government-users?error=${encodeURIComponent(
        error instanceof Error ? error.message : "User delete failed."
      )}`
    );
  }
}

export default async function GovernmentUsersPage({ searchParams }) {
  await requireAdmin();
  const session = await getSession();
  const params = await searchParams;
  const snapshot = await getGovernmentAdminSnapshot();

  return (
    <PanelShell
      title="Government User Root"
      description="Panel-admin control over every Government Access account without requiring a separate government login."
    >
      {params?.saved ? (
        <section className="panel-card system-banner">
          <p>
            Government user registry updated via panel-admin action: {String(params.saved)}.
          </p>
          {params?.temporaryPassword ? (
            <p className="helper-text">
              Temporary password: <strong>{String(params.temporaryPassword)}</strong>
            </p>
          ) : null}
        </section>
      ) : null}

      {params?.error ? (
        <section className="panel-card system-banner system-banner--error">
          <p>{String(params.error)}</p>
        </section>
      ) : null}

      <section className="panel-split">
        <form action={createGovernmentUserAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Super Admin</p>
              <h2>Create Government User</h2>
            </div>
            <span className="status-badge">actor {session?.username}</span>
          </div>

          <label className="field">
            <span>Username</span>
            <input name="username" required />
          </label>
          <label className="field">
            <span>Display Name</span>
            <input name="displayName" required />
          </label>
          <label className="field">
            <span>Role</span>
            <select defaultValue="Citizen" name="role">
              {accessRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Assigned District</span>
            <select defaultValue="" name="assignedDistrict">
              <option value="">None</option>
              {snapshot.districtProfiles.map((district) => (
                <option key={district.id} value={district.canonicalName}>
                  {district.canonicalName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Temporary Password</span>
            <input name="temporaryPassword" placeholder="Leave blank to auto-generate" />
          </label>
          <label className="checkbox-field">
            <input defaultChecked name="forcePasswordChange" type="checkbox" />
            <span>Force password change on first login</span>
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows="4" />
          </label>
          <button className="button button--solid" type="submit">
            Create Government User
          </button>
        </form>

        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Registry Status</p>
              <h2>Access Overview</h2>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat-chip">
              <span>Total Accounts</span>
              <strong>{snapshot.governmentUsers.length}</strong>
            </div>
            <div className="stat-chip">
              <span>Active</span>
              <strong>{snapshot.governmentUsers.filter((user) => user.active).length}</strong>
            </div>
            <div className="stat-chip">
              <span>Forced Password Change</span>
              <strong>
                {
                  snapshot.governmentUsers.filter((user) => user.forcePasswordChange)
                    .length
                }
              </strong>
            </div>
          </div>
          <p className="helper-text">
            This page writes directly through the admin API store, so panel admins can
            manage the full government account registry from one place.
          </p>
        </section>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Government Access Accounts</p>
            <h2>Edit Everyone</h2>
          </div>
        </div>
        <div className="government-user-list">
          {snapshot.governmentUsers.map((user) => (
            <article className="panel-card government-user-card" key={user.username}>
              <form action={updateGovernmentUserAction} className="form-card">
                <input name="username" type="hidden" value={user.username} />
                <div className="panel-card__header">
                  <div>
                    <p className="card__kicker">{user.username}</p>
                    <h2>{user.displayName}</h2>
                  </div>
                  <span className="status-badge">
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="stat-row">
                  <div className="stat-chip">
                    <span>Created</span>
                    <strong>{user.createdAt || "Unknown"}</strong>
                  </div>
                  <div className="stat-chip">
                    <span>Last Login</span>
                    <strong>{user.lastLoginAt || "Never"}</strong>
                  </div>
                </div>

                <div className="panel-grid">
                  <label className="field">
                    <span>Display Name</span>
                    <input defaultValue={user.displayName} name="displayName" required />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select defaultValue={user.role} name="role">
                      {accessRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Assigned District</span>
                    <select defaultValue={user.assignedDistrict || ""} name="assignedDistrict">
                      <option value="">None</option>
                      {snapshot.districtProfiles.map((district) => (
                        <option key={district.id} value={district.canonicalName}>
                          {district.canonicalName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="control-links">
                  <label className="checkbox-field">
                    <input defaultChecked={user.active} name="active" type="checkbox" />
                    <span>Active account</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={user.forcePasswordChange}
                      name="forcePasswordChange"
                      type="checkbox"
                    />
                    <span>Force password change</span>
                  </label>
                </div>

                <label className="field">
                  <span>Notes</span>
                  <textarea defaultValue={user.notes} name="notes" rows="4" />
                </label>

                <div className="record-actions">
                  <button className="button button--solid" type="submit">
                    Save User
                  </button>
                </div>
              </form>

              <div className="record-actions">
                <form action={resetGovernmentUserPasswordAction}>
                  <input name="username" type="hidden" value={user.username} />
                  <button className="button button--ghost" type="submit">
                    Reset Password
                  </button>
                </form>
                <form action={disableGovernmentUserAction}>
                  <input name="username" type="hidden" value={user.username} />
                  <button className="button button--ghost" disabled={!user.active} type="submit">
                    Disable
                  </button>
                </form>
                <form action={deleteGovernmentUserAction}>
                  <input name="username" type="hidden" value={user.username} />
                  <button className="button button--ghost button--danger" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PanelShell>
  );
}
