import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

async function addExcommunicationAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/excommunications", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      reason: formData.get("reason"),
      decree: formData.get("decree"),
      date: formData.get("date"),
      notes: formData.get("notes")
    })
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

async function deleteExcommunicationAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/excommunications/${formData.get("id")}`, {
    method: "DELETE"
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

async function moveExcommunicationAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/excommunications/${formData.get("id")}/move`, {
    method: "POST",
    body: JSON.stringify({
      direction: formData.get("direction")
    })
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

async function addEnemyNationAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/enemy-nations", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      classification: formData.get("classification"),
      notes: formData.get("notes")
    })
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

async function deleteEnemyNationAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/enemy-nations/${formData.get("id")}`, {
    method: "DELETE"
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

async function moveEnemyNationAction(formData) {
  "use server";

  await fetchAdmin(`/api/admin/enemy-nations/${formData.get("id")}/move`, {
    method: "POST",
    body: JSON.stringify({
      direction: formData.get("direction")
    })
  });

  revalidatePath("/excommunications");
  redirect("/excommunications");
}

function OrderControls({ id, isFirst, isLast, moveAction, deleteAction }) {
  return (
    <div className="record-actions">
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <button
          className="button button--ghost"
          disabled={isFirst}
          name="direction"
          type="submit"
          value="up"
        >
          Up
        </button>
      </form>
      <form action={moveAction}>
        <input name="id" type="hidden" value={id} />
        <button
          className="button button--ghost"
          disabled={isLast}
          name="direction"
          type="submit"
          value="down"
        >
          Down
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
            isFirst={index === 0}
            isLast={index === items.length - 1}
            moveAction={moveAction}
          />
        </article>
      ))}
    </div>
  );
}

export default async function ExcommunicationsPage() {
  await requireAuth();
  const content = await fetchPublic("/api/content");
  const excommunications = content.excommunications || [];
  const enemyNations = content.enemyNations || [];

  return (
    <PanelShell
      title="Excommunications"
      description="Manage disciplinary records and hostile nation entries without the extra clutter."
    >
      <section className="panel-split">
        <form action={addExcommunicationAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Create</p>
              <h2>Add Excommunication</h2>
            </div>
          </div>
          <label className="field">
            <span>Name</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Reason</span>
            <input name="reason" required />
          </label>
          <label className="field">
            <span>Decree</span>
            <input name="decree" required />
          </label>
          <label className="field">
            <span>Date</span>
            <input defaultValue={new Date().toISOString().slice(0, 10)} name="date" type="date" />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows="4" />
          </label>
          <button className="button button--solid" type="submit">
            Save Entry
          </button>
        </form>

        <section className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Live Order</p>
              <h2>Excommunications</h2>
            </div>
            <p className="helper-text">The first item appears first on the public record.</p>
          </div>
          <OrderedList
            deleteAction={deleteExcommunicationAction}
            emptyMessage="No excommunications have been published."
            items={excommunications}
            moveAction={moveExcommunicationAction}
            renderMeta={(entry) => (
              <>
                <p>{entry.reason} / {entry.decree}</p>
                <small>{entry.date}</small>
              </>
            )}
          />
        </section>
      </section>

      <section className="panel-split">
        <form action={addEnemyNationAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Create</p>
              <h2>Add Enemy Nation</h2>
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
            Save Enemy Nation
          </button>
        </form>

        <section className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Live Order</p>
              <h2>Enemy Nations</h2>
            </div>
            <p className="helper-text">Use short labels to keep the public page neat.</p>
          </div>
          <OrderedList
            deleteAction={deleteEnemyNationAction}
            emptyMessage="No enemy nations are currently listed."
            items={enemyNations}
            moveAction={moveEnemyNationAction}
            renderMeta={(entry) => (
              <>
                <p>{entry.classification}</p>
                <small>{entry.notes}</small>
              </>
            )}
          />
        </section>
      </section>
    </PanelShell>
  );
}
