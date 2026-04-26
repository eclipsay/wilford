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

export default async function ExcommunicationsPage() {
  await requireAuth();
  const content = await fetchPublic("/api/content");
  const excommunications = content.excommunications || [];
  const enemyNations = content.enemyNations || [];

  return (
    <PanelShell
      title="Excommunications"
      description="Manage removed individuals and hostile nations shown on the public site."
    >
      <section className="panel-split">
        <form action={addExcommunicationAction} className="panel-card form-card">
          <p className="card__kicker">Add Excommunication</p>
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
              <p className="card__kicker">Current Excommunications</p>
              <h2>Manual Order</h2>
            </div>
          </div>
          <div className="record-list">
            {excommunications.length ? (
              excommunications.map((entry) => (
                <article className="record-item record-item--stacked" key={entry.id}>
                  <div>
                    <h2>{entry.name}</h2>
                    <p>{entry.reason} / {entry.decree}</p>
                    <small>{entry.date}</small>
                  </div>
                  <OrderControls
                    id={entry.id}
                    moveAction={moveExcommunicationAction}
                    deleteAction={deleteExcommunicationAction}
                  />
                </article>
              ))
            ) : (
              <p>No excommunications have been published.</p>
            )}
          </div>
        </section>
      </section>

      <section className="panel-split">
        <form action={addEnemyNationAction} className="panel-card form-card">
          <p className="card__kicker">Add Enemy Nation</p>
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
            Save Enemy Nation
          </button>
        </form>

        <section className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Enemies Of The State</p>
              <h2>Manual Order</h2>
            </div>
          </div>
          <div className="record-list">
            {enemyNations.length ? (
              enemyNations.map((entry) => (
                <article className="record-item record-item--stacked" key={entry.id}>
                  <div>
                    <h2>{entry.name}</h2>
                    <p>{entry.classification}</p>
                    <small>{entry.notes}</small>
                  </div>
                  <OrderControls
                    id={entry.id}
                    moveAction={moveEnemyNationAction}
                    deleteAction={deleteEnemyNationAction}
                  />
                </article>
              ))
            ) : (
              <p>No enemy nations are currently listed.</p>
            )}
          </div>
        </section>
      </section>
    </PanelShell>
  );
}
