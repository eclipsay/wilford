import { revalidatePath } from "next/cache";
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
}

async function deleteExcommunicationAction(formData) {
  "use server";
  const id = formData.get("id");

  await fetchAdmin(`/api/admin/excommunications/${id}`, {
    method: "DELETE"
  });

  revalidatePath("/excommunications");
}

export default async function ExcommunicationsPage() {
  await requireAuth();
  const { excommunications } = await fetchPublic("/api/excommunications");

  return (
    <PanelShell
      title="Excommunications"
      description="Publish and remove disciplinary entries shown on the public site."
    >
      <section className="panel-split">
        <form action={addExcommunicationAction} className="panel-card form-card">
          <p className="card__kicker">Add Entry</p>
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
          <p className="card__kicker">Current Entries</p>
          <div className="record-list">
            {excommunications.length ? (
              excommunications.map((entry) => (
                <article className="record-item" key={entry.id}>
                  <div>
                    <h2>{entry.name}</h2>
                    <p>{entry.reason} / {entry.decree}</p>
                    <small>{entry.date}</small>
                  </div>
                  <form action={deleteExcommunicationAction}>
                    <input name="id" type="hidden" value={entry.id} />
                    <button className="button button--ghost" type="submit">
                      Delete
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <p>No excommunications have been published.</p>
            )}
          </div>
        </section>
      </section>
    </PanelShell>
  );
}
