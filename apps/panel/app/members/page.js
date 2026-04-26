import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { updatePanelContent } from "../../lib/content-file";
import { PanelShell } from "../../components/PanelShell";

function formatMembersEditor(members) {
  return members
    .map(
      (member) =>
        [
          member.name || "",
          member.role || "",
          member.notes || "",
          member.status || ""
        ].join(" | ")
    )
    .join("\n");
}

function formatAlliancesEditor(alliances) {
  return alliances
    .map(
      (alliance) =>
        [alliance.name || "", alliance.classification || "", alliance.notes || ""].join(
          " | "
        )
    )
    .join("\n");
}

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

async function saveMembersAction(formData) {
  "use server";

  const members = parsePipeList(formData.get("membersEditor"), [
    "name",
    "role",
    "notes",
    "status"
  ]).map((member, index) => ({
    id: createId("member"),
    name: member.name,
    role: member.role,
    notes: member.notes,
    status: member.status || "Active",
    order: index
  }));

  try {
    await updatePanelContent((content) => ({
      ...content,
      members
    }));
  } catch {
    redirect("/members?error=members");
  }

  revalidatePath("/members");
  redirect("/members?saved=members");
}

async function saveAlliancesAction(formData) {
  "use server";

  const alliances = parsePipeList(formData.get("alliancesEditor"), [
    "name",
    "classification",
    "notes"
  ]).map((alliance, index) => ({
    id: createId("alliance"),
    name: alliance.name,
    classification: alliance.classification || "Nation",
    notes: alliance.notes,
    order: index
  }));

  try {
    await updatePanelContent((content) => ({
      ...content,
      alliances
    }));
  } catch {
    redirect("/members?error=alliances");
  }

  revalidatePath("/members");
  redirect("/members?saved=alliances");
}

export default async function MembersPage({ searchParams }) {
  await requireAuth();
  const content = await fetchPublic("/api/content");
  const params = await searchParams;
  const members = content.members || [];
  const alliances = content.alliances || [];

  return (
    <PanelShell
      title="Members"
      description="Edit the public roster as ordered text lines. The top line appears first on the site."
    >
      {params?.saved === "members" ? (
        <section className="panel-card system-banner">
          <p>Members were saved successfully.</p>
        </section>
      ) : null}

      {params?.saved === "alliances" ? (
        <section className="panel-card system-banner">
          <p>Alliances were saved successfully.</p>
        </section>
      ) : null}

      {params?.error === "members" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Saving members failed. Check file permissions and panel server logs.</p>
        </section>
      ) : null}

      {params?.error === "alliances" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Saving alliances failed. Check file permissions and panel server logs.</p>
        </section>
      ) : null}

      <section className="panel-split">
        <form action={saveMembersAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Roster Editor</p>
              <h2>Members</h2>
            </div>
          </div>
          <div className="panel-example">
            <strong>Format Example</strong>
            <code>Lemmie | Chairman | Runs the operation | Active</code>
            <code>Eclip | Executive Director &amp; Lead Developer | Builds the system | Active</code>
          </div>
          <label className="field">
            <span>One member per line: Name | Role | Notes | Status</span>
            <textarea
              defaultValue={formatMembersEditor(members)}
              name="membersEditor"
              rows="14"
            />
          </label>
          <button className="button button--solid" type="submit">
            Save Members
          </button>
        </form>

        <form action={saveAlliancesAction} className="panel-card form-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Roster Editor</p>
              <h2>Alliances</h2>
            </div>
          </div>
          <div className="panel-example">
            <strong>Format Example</strong>
            <code>Wilford North | Nation | Trusted trading partner</code>
            <code>Signal Pact | Coalition | Joint operations and logistics</code>
          </div>
          <label className="field">
            <span>One alliance per line</span>
            <textarea
              defaultValue={formatAlliancesEditor(alliances)}
              name="alliancesEditor"
              rows="14"
            />
          </label>
          <button className="button button--solid" type="submit">
            Save Alliances
          </button>
        </form>
      </section>
    </PanelShell>
  );
}
