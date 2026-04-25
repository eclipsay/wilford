import { revalidatePath } from "next/cache";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

async function saveSettingsAction(formData) {
  "use server";

  await fetchAdmin("/api/admin/settings", {
    method: "POST",
    body: JSON.stringify({
      homepageEyebrow: formData.get("homepageEyebrow"),
      homepageHeadline: formData.get("homepageHeadline"),
      homepageDescription: formData.get("homepageDescription"),
      chairmanName: formData.get("chairmanName"),
      commitsRepository: formData.get("commitsRepository")
    })
  });

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  await requireAuth();
  const { settings } = await fetchPublic("/api/settings");

  return (
    <PanelShell
      title="Settings"
      description="Control the public website’s headline, chairman naming, and shared display settings."
    >
      <form action={saveSettingsAction} className="panel-card form-card form-card--wide">
        <p className="card__kicker">Website Settings</p>
        <label className="field">
          <span>Homepage Eyebrow</span>
          <input defaultValue={settings.homepageEyebrow} name="homepageEyebrow" />
        </label>
        <label className="field">
          <span>Homepage Headline</span>
          <input defaultValue={settings.homepageHeadline} name="homepageHeadline" />
        </label>
        <label className="field">
          <span>Homepage Description</span>
          <textarea defaultValue={settings.homepageDescription} name="homepageDescription" rows="5" />
        </label>
        <label className="field">
          <span>Chairman Name</span>
          <input defaultValue={settings.chairmanName} name="chairmanName" />
        </label>
        <label className="field">
          <span>Commits Repository</span>
          <input defaultValue={settings.commitsRepository} name="commitsRepository" />
        </label>
        <button className="button button--solid" type="submit">
          Save Settings
        </button>
      </form>
    </PanelShell>
  );
}
