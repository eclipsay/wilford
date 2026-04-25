import { revalidatePath } from "next/cache";
import { fetchAdmin } from "../../lib/api";
import { requireOwner } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

async function addUserAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/users", {
    method: "POST",
    headers: {
      "x-admin-role": "owner"
    },
    body: JSON.stringify({
      username: formData.get("username"),
      password: formData.get("password"),
      role: formData.get("role")
    })
  });

  revalidatePath("/users");
}

async function deleteUserAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/users/${formData.get("id")}`, {
    method: "DELETE",
    headers: {
      "x-admin-role": "owner"
    }
  });

  revalidatePath("/users");
}

export default async function UsersPage() {
  await requireOwner();
  const data = await fetchAdmin("/api/admin/users", {
    headers: {
      "x-admin-role": "owner"
    }
  });

  return (
    <PanelShell
      title="Panel Users"
      description="Owner-only access for creating and removing panel accounts."
    >
      <section className="panel-split">
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

        <section className="panel-card list-card">
          <p className="card__kicker">Current Accounts</p>
          <div className="record-list">
            <article className="record-item">
              <div>
                <h2>{data.owner.username}</h2>
                <p>Built-in owner account</p>
                <small>{data.owner.role}</small>
              </div>
            </article>
            {data.users.map((user) => (
              <article className="record-item" key={user.id}>
                <div>
                  <h2>{user.username}</h2>
                  <p>Managed panel account</p>
                  <small>{user.role}</small>
                </div>
                <form action={deleteUserAction}>
                  <input name="id" type="hidden" value={user.id} />
                  <button className="button button--ghost" type="submit">
                    Delete
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </section>
    </PanelShell>
  );
}
