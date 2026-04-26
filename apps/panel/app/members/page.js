import Link from "next/link";
import { revalidatePath } from "next/cache";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

function sortMembers(members, sort) {
  const sorted = [...members];

  if (sort === "status") {
    return sorted.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  }

  if (sort === "division") {
    return sorted.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  }

  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

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

export default async function MembersPage({ searchParams }) {
  await requireAuth();
  const { members } = await fetchPublic("/api/members");
  const params = await searchParams;
  const sort = params?.sort || "name";
  const sortedMembers = sortMembers(members, sort);

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
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Current Members</p>
              <h2>Roster</h2>
            </div>
            <div className="sort-row">
              <Link className={`button ${sort === "name" ? "button--active" : ""}`} href="/members?sort=name">
                Name
              </Link>
              <Link className={`button ${sort === "status" ? "button--active" : ""}`} href="/members?sort=status">
                Status
              </Link>
              <Link className={`button ${sort === "division" ? "button--active" : ""}`} href="/members?sort=division">
                Division
              </Link>
            </div>
          </div>
          <div className="record-list">
            {sortedMembers.map((member) => (
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
