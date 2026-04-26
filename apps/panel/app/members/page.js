import { revalidatePath } from "next/cache";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

async function addMemberAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/members", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      role: formData.get("role"),
      division: formData.get("division"),
      status: formData.get("status"),
      notes: formData.get("notes")
    })
  });

  revalidatePath("/members");
}

async function deleteMemberAction(formData) {
  "use server";

  const id = formData.get("id");
  await fetchAdmin(`/api/admin/members/${id}`, {
    method: "DELETE"
  });

  revalidatePath("/members");
}

async function moveMemberAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/members/${formData.get("id")}/move`, {
    method: "POST",
    body: JSON.stringify({
      direction: formData.get("direction")
    })
  });

  revalidatePath("/members");
}

async function addAllianceAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/alliances", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      classification: formData.get("classification"),
      notes: formData.get("notes")
    })
  });

  revalidatePath("/members");
}

async function deleteAllianceAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/alliances/${formData.get("id")}`, {
    method: "DELETE"
  });

  revalidatePath("/members");
}

async function moveAllianceAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/alliances/${formData.get("id")}/move`, {
    method: "POST",
    body: JSON.stringify({
      direction: formData.get("direction")
    })
  });

  revalidatePath("/members");
}

function OrderControls({ id, moveAction, deleteAction }) {
  return (
    <div className="record-actions">
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <input name="direction" type="hidden" value="up" />
        <button className="button button--ghost" type="submit">
          Move Up
        </button>
      </form>
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <input name="direction" type="hidden" value="down" />
        <button className="button button--ghost" type="submit">
          Move Down
        </button>
      </form>
      <form action={deleteAction}>
        <input name="id" type="hidden" value={id} />
        <button className="button button--ghost" type="submit">
          Delete
        </button>
      </form>
    </div>
  );
}

export default async function MembersPage() {
  await requireAuth();
  const content = await fetchPublic("/api/content");
  const members = content.members || [];
  const alliances = content.alliances || [];

  return (
    <PanelShell
      title="Members"
      description="Manage members and allied nations shown on the public site."
    >
      <section className="panel-split">
        <form action={addMemberAction} className="panel-card form-card">
          <p className="card__kicker">Add Member</p>
          <label className="field">
            <span>Name</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Role</span>
            <input name="role" required />
          </label>
          <label className="field">
            <span>Division</span>
            <input name="division" required />
          </label>
          <label className="field">
            <span>Status</span>
            <input defaultValue="Active" name="status" required />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows="4" />
          </label>
          <button className="button button--solid" type="submit">
            Save Member
          </button>
        </form>

        <section className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Current Members</p>
              <h2>Manual Order</h2>
            </div>
          </div>
          <div className="record-list">
            {members.map((member) => (
              <article className="record-item record-item--stacked" key={member.id}>
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.role} / {member.division}</p>
                  <small>{member.status}</small>
                </div>
                <OrderControls
                  id={member.id}
                  moveAction={moveMemberAction}
                  deleteAction={deleteMemberAction}
                />
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel-split">
        <form action={addAllianceAction} className="panel-card form-card">
          <p className="card__kicker">Add Alliance</p>
          <label className="field">
            <span>Nation Name</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Classification</span>
            <input defaultValue="Nation" name="classification" required />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows="4" />
          </label>
          <button className="button button--solid" type="submit">
            Save Alliance
          </button>
        </form>

        <section className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Allied Nations</p>
              <h2>Manual Order</h2>
            </div>
          </div>
          <div className="record-list">
            {alliances.length ? (
              alliances.map((alliance) => (
                <article className="record-item record-item--stacked" key={alliance.id}>
                  <div>
                    <h2>{alliance.name}</h2>
                    <p>{alliance.classification}</p>
                    <small>{alliance.notes}</small>
                  </div>
                  <OrderControls
                    id={alliance.id}
                    moveAction={moveAllianceAction}
                    deleteAction={deleteAllianceAction}
                  />
                </article>
              ))
            ) : (
              <p>No allied nations are currently listed.</p>
            )}
          </div>
        </section>
      </section>
    </PanelShell>
  );
}
