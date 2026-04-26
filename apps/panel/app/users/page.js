import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PanelShell } from "../../components/PanelShell";
import {
  getPanelContentFile,
  hashPanelPassword,
  updatePanelContent
} from "../../lib/content-file";
import { getSession, requireAdmin } from "../../lib/auth";

function roleRank(role) {
  if (role === "owner") {
    return 3;
  }

  if (role === "admin") {
    return 2;
  }

  return 1;
}

function canResetPassword(actorRole, targetRole) {
  return roleRank(actorRole) > roleRank(targetRole);
}

async function addUserAction(formData) {
  "use server";

  const session = await getSession();

  if (session?.role !== "owner") {
    redirect("/users?error=rank");
  }

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const role = String(formData.get("role") || "editor").trim();

  if (!username || !password) {
    redirect("/users?error=create");
  }

  await updatePanelContent((content) => ({
    ...content,
    panelUsers: [
      {
        id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        username,
        role,
        passwordHash: hashPanelPassword(password),
        createdAt: new Date().toISOString()
      },
      ...(content.panelUsers || [])
    ]
  }));

  revalidatePath("/users");
  redirect("/users?saved=create");
}

async function resetPasswordAction(formData) {
  "use server";

  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "").trim();
  const targetRole = String(formData.get("targetRole") || "editor");

  if (!canResetPassword(session.role, targetRole) || !password) {
    redirect("/users?error=rank");
  }

  await updatePanelContent((content) => ({
    ...content,
    panelUsers: (content.panelUsers || []).map((user) =>
      user.id === id
        ? {
            ...user,
            passwordHash: hashPanelPassword(password)
          }
        : user
    )
  }));

  revalidatePath("/users");
  redirect("/users?saved=reset");
}

async function deleteUserAction(formData) {
  "use server";

  const session = await getSession();

  if (session?.role !== "owner") {
    redirect("/users?error=rank");
  }

  const id = String(formData.get("id") || "");

  await updatePanelContent((content) => ({
    ...content,
    panelUsers: (content.panelUsers || []).filter((user) => user.id !== id)
  }));

  revalidatePath("/users");
  redirect("/users?saved=delete");
}

export default async function UsersPage({ searchParams }) {
  const session = await requireAdmin();
  const params = await searchParams;
  const content = await getPanelContentFile();
  const users = (content.panelUsers || []).map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  }));

  return (
    <PanelShell
      title="Panel Users"
      description="Password resets and account management based on panel rank."
    >
      {params?.saved === "create" ? (
        <section className="panel-card system-banner">
          <p>User account created successfully.</p>
        </section>
      ) : null}

      {params?.saved === "reset" ? (
        <section className="panel-card system-banner">
          <p>Password reset completed successfully.</p>
        </section>
      ) : null}

      {params?.saved === "delete" ? (
        <section className="panel-card system-banner">
          <p>User account deleted successfully.</p>
        </section>
      ) : null}

      {params?.error === "rank" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Your panel rank does not allow that password or account action.</p>
        </section>
      ) : null}

      {params?.error === "create" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Username and password are required to create a user.</p>
        </section>
      ) : null}

      <section className="panel-split">
        {session.role === "owner" ? (
          <form action={addUserAction} className="panel-card form-card">
            <p className="card__kicker">Add User</p>
            <label className="field">
              <span>Username</span>
              <input name="username" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" required />
            </label>
            <label className="field">
              <span>Role</span>
              <select defaultValue="editor" name="role">
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button className="button button--solid" type="submit">
              Create User
            </button>
          </form>
        ) : (
          <section className="panel-card">
            <p className="card__kicker">Permissions</p>
            <h2>Admin Access</h2>
            <p>
              Admins can reset passwords for users below admin rank. Owner
              remains env-managed and owner-level account creation stays owner-only.
            </p>
          </section>
        )}

        <section className="panel-card list-card">
          <p className="card__kicker">Current Accounts</p>
          <div className="record-list">
            <article className="record-item">
              <div>
                <h2>{process.env.PANEL_OWNER_USERNAME || "Owner"}</h2>
                <p>Built-in owner account</p>
                <small>owner / env-managed</small>
              </div>
            </article>
            {users.map((user) => (
              <article className="record-item" key={user.id}>
                <div>
                  <h2>{user.username}</h2>
                  <p>Managed panel account</p>
                  <small>{user.role}</small>
                </div>
                <div className="record-actions">
                  {canResetPassword(session.role, user.role) ? (
                    <form action={resetPasswordAction} className="record-actions__position">
                      <input name="id" type="hidden" value={user.id} />
                      <input name="targetRole" type="hidden" value={user.role} />
                      <input name="password" placeholder="New password" type="password" required />
                      <button className="button button--ghost" type="submit">
                        Reset Password
                      </button>
                    </form>
                  ) : null}
                  {session.role === "owner" ? (
                    <form action={deleteUserAction}>
                      <input name="id" type="hidden" value={user.id} />
                      <button className="button button--ghost button--danger" type="submit">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </PanelShell>
  );
}
