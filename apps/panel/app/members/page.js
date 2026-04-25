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

export default async function MembersPage() {
  await requireAuth();
  const { members } = await fetchPublic("/api/members");

  return (
    <PanelShell
      title="Members"
      description="Add, review, and remove public member records."
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
          <p className="card__kicker">Current Members</p>
          <div className="record-list">
            {members.map((member) => (
              <article className="record-item" key={member.id}>
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.role} / {member.division}</p>
                  <small>{member.status}</small>
                </div>
                <form action={deleteMemberAction}>
                  <input name="id" type="hidden" value={member.id} />
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
