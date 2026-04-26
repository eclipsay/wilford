import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { updatePanelContent } from "../../lib/content-file";
import { PanelShell } from "../../components/PanelShell";

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePipeList(value, columns) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return columns.reduce((entry, column, index) => {
        entry[column] = parts[index] || "";
        return entry;
      }, {});
    });
}

function formatExcommunicationsEditor(entries) {
  return entries
    .map((entry) =>
      [entry.name || "", entry.reason || "", entry.notes || "", entry.date || ""].join(" | ")
    )
    .join("\n");
}

function formatEnemiesEditor(entries) {
  return entries
    .map((entry) =>
      [entry.name || "", entry.classification || "", entry.notes || ""].join(" | ")
    )
    .join("\n");
}

async function saveExcommunicationsAction(formData) {
  "use server";

  const excommunications = parsePipeList(formData.get("excommunicationsEditor"), [
    "name",
    "reason",
    "notes",
    "date"
  ]).map((entry, index) => ({
    id: createId("excommunication"),
    name: entry.name,
    reason: entry.reason,
    decree: entry.reason,
    notes: entry.notes,
    date: entry.date || new Date().toISOString().slice(0, 10),
    order: index
  }));

  try {
    await updatePanelContent((content) => ({
      ...content,
      excommunications
    }));
  } catch {
    redirect("/excommunications?error=excommunications");
  }

  revalidatePath("/excommunications");
  redirect("/excommunications?saved=excommunications");
}

async function saveEnemiesAction(formData) {
  "use server";

  const enemyNations = parsePipeList(formData.get("enemiesEditor"), [
    "name",
    "classification",
    "notes"
  ]).map((entry, index) => ({
    id: createId("enemy"),
    name: entry.name,
    classification: entry.classification || "Nation",
    notes: entry.notes,
    order: index
  }));

  try {
    await updatePanelContent((content) => ({
      ...content,
      enemyNations
    }));
  } catch {
    redirect("/excommunications?error=enemies");
  }

  revalidatePath("/excommunications");
  redirect("/excommunications?saved=enemies");
}

export default async function ExcommunicationsPage({ searchParams }) {
  await requireAuth();
  const content = await fetchPublic("/api/content");
  const params = await searchParams;
  const excommunications = content.excommunications || [];
  const enemyNations = content.enemyNations || [];

  return (
    <PanelShell
      title="Excommunications"
      description="Edit excommunications and enemy nations as ordered text lines."
    >
      {params?.saved === "excommunications" ? (
        <section className="panel-card system-banner">
          <p>Excommunications were saved successfully.</p>
        </section>
      ) : null}

      {params?.saved === "enemies" ? (
        <section className="panel-card system-banner">
          <p>Enemy nations were saved successfully.</p>
        </section>
      ) : null}

      {params?.error === "excommunications" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Saving excommunications failed. Check file permissions and panel server logs.</p>
        </section>
      ) : null}

      {params?.error === "enemies" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Saving enemy nations failed. Check file permissions and panel server logs.</p>
        </section>
      ) : null}

      <section className="panel-split">
        <form action={saveExcommunicationsAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Register Editor</p>
              <h2>Excommunications</h2>
            </div>
          </div>
          <div className="panel-example">
            <strong>Format Example</strong>
            <code>Lemmie | Treason | Removed from leadership | 2026-04-25</code>
            <code>Eclip | Breach of protocol | Restricted from access | 2026-04-26</code>
          </div>
          <label className="field">
            <span>One entry per line: Name | Reason | Notes | Date</span>
            <textarea
              defaultValue={formatExcommunicationsEditor(excommunications)}
              name="excommunicationsEditor"
              rows="14"
            />
          </label>
          <button className="button button--solid" type="submit">
            Save Excommunications
          </button>
        </form>

        <form action={saveEnemiesAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Register Editor</p>
              <h2>Enemy Nations</h2>
            </div>
          </div>
          <div className="panel-example">
            <strong>Format Example</strong>
            <code>Blackwater | Nation | Repeated hostile incursions</code>
            <code>Iron Pact | Coalition | Active operational threat</code>
          </div>
          <label className="field">
            <span>One entry per line: Name | Type | Notes</span>
            <textarea
              defaultValue={formatEnemiesEditor(enemyNations)}
              name="enemiesEditor"
              rows="14"
            />
          </label>
          <button className="button button--solid" type="submit">
            Save Enemy Nations
          </button>
        </form>
      </section>
    </PanelShell>
  );
}
