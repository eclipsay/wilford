import Link from "next/link";
import { revalidatePath } from "next/cache";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

function sortEntries(entries, sort) {
  const sorted = [...entries];

  if (sort === "date") {
    return sorted.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name));
  }

  if (sort === "reason") {
    return sorted.sort((a, b) => a.reason.localeCompare(b.reason) || a.name.localeCompare(b.name));
  }

  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

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

export default async function ExcommunicationsPage({ searchParams }) {
  await requireAuth();
  const { excommunications } = await fetchPublic("/api/excommunications");
  const params = await searchParams;
  const sort = params?.sort || "date";
  const sortedEntries = sortEntries(excommunications, sort);

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
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Current Entries</p>
              <h2>Discipline Register</h2>
            </div>
            <div className="sort-row">
              <Link className={`button ${sort === "date" ? "button--active" : ""}`} href="/excommunications?sort=date">
                Date
              </Link>
              <Link className={`button ${sort === "name" ? "button--active" : ""}`} href="/excommunications?sort=name">
                Name
              </Link>
              <Link className={`button ${sort === "reason" ? "button--active" : ""}`} href="/excommunications?sort=reason">
                Reason
              </Link>
            </div>
          </div>
          <div className="record-list">
            {sortedEntries.length ? (
              sortedEntries.map((entry) => (
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
