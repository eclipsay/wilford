import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  redirect("/members");
}

async function deleteMemberAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/members/${formData.get("id")}`, {
    method: "DELETE"
  });

  revalidatePath("/members");
  redirect("/members");
}

async function moveMemberAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/members/${formData.get("id")}/position`, {
    method: "POST",
    body: JSON.stringify({
      targetIndex: Number(formData.get("targetIndex") ?? 0)
    })
  });

  revalidatePath("/members");
  redirect("/members");
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
  redirect("/members");
}

async function deleteAllianceAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/alliances/${formData.get("id")}`, {
    method: "DELETE"
  });

  revalidatePath("/members");
  redirect("/members");
}

async function moveAllianceAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/alliances/${formData.get("id")}/position`, {
    method: "POST",
    body: JSON.stringify({
      targetIndex: Number(formData.get("targetIndex") ?? 0)
    })
  });

  revalidatePath("/members");
  redirect("/members");
}

function OrderControls({
  id,
  index,
  total,
  isFirst,
  isLast,
  moveAction,
  deleteAction
}) {
  return (
    <div className="record-actions">
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <input name="targetIndex" type="hidden" value={Math.max(0, index - 1)} />
        <button
          className="button button--ghost"
          disabled={isFirst}
          type="submit"
        >
          Up
        </button>
      </form>
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <input
          name="targetIndex"
          type="hidden"
          value={Math.min(total - 1, index + 1)}
        />
        <button
          className="button button--ghost"
          disabled={isLast}
          type="submit"
        >
          Down
        </button>
      </form>
      <form action={moveAction} className="record-actions__position">
        <input name="id" type="hidden" value={id} />
        <label className="sr-only" htmlFor={`position-${id}`}>
          Position for {id}
        </label>
        <select defaultValue={index} id={`position-${id}`} name="targetIndex">
          {Array.from({ length: total }, (_, position) => (
            <option key={position} value={position}>
              Position {position + 1}
            </option>
          ))}
        </select>
        <button className="button button--ghost" type="submit">
          Move
        </button>
      </form>
      <form action={deleteAction}>
        <input name="id" type="hidden" value={id} />
        <button className="button button--ghost button--danger" type="submit">
          Delete
        </button>
      </form>
    </div>
  );
}

function OrderedList({ items, emptyMessage, renderMeta, moveAction, deleteAction }) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="record-list">
      {items.map((item, index) => (
        <article className="record-item" key={item.id}>
          <div className="record-copy">
            <span className="record-order">#{index + 1}</span>
            <h2>{item.name}</h2>
            {renderMeta(item)}
          </div>
          <OrderControls
            deleteAction={deleteAction}
            id={item.id}
            index={index}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            moveAction={moveAction}
            total={items.length}
          />
        </article>
      ))}
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
      description="Add, reorder, and remove the people and allied nations shown on the public site."
    >
      <section className="panel-split">
        <form action={addMemberAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Create</p>
              <h2>Add Member</h2>
            </div>
          </div>
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
              <p className="card__kicker">Live Order</p>
              <h2>Members</h2>
            </div>
            <p className="helper-text">Top to bottom matches the public page.</p>
          </div>
          <OrderedList
            deleteAction={deleteMemberAction}
            emptyMessage="No members have been added yet."
            items={members}
            moveAction={moveMemberAction}
            renderMeta={(member) => (
              <>
                <p>{member.role} / {member.division}</p>
                <small>{member.status}</small>
              </>
            )}
          />
        </section>
      </section>

      <section className="panel-split">
        <form action={addAllianceAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Create</p>
              <h2>Add Alliance</h2>
            </div>
          </div>
          <label className="field">
            <span>Name</span>
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
              <p className="card__kicker">Live Order</p>
              <h2>Alliances</h2>
            </div>
            <p className="helper-text">Keep these concise for the public roster.</p>
          </div>
          <OrderedList
            deleteAction={deleteAllianceAction}
            emptyMessage="No allied nations are currently listed."
            items={alliances}
            moveAction={moveAllianceAction}
            renderMeta={(alliance) => (
              <>
                <p>{alliance.classification}</p>
                <small>{alliance.notes}</small>
              </>
            )}
          />
        </section>
      </section>
    </PanelShell>
  );
}
