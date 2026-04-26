import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { updatePanelContent } from "../../lib/content-file";
import { PanelShell } from "../../components/PanelShell";

async function saveSettingsAction(formData) {
  "use server";

  try {
    await updatePanelContent((content) => ({
      ...content,
      settings: {
        ...content.settings,
        homepageEyebrow: formData.get("homepageEyebrow"),
        homepageHeadline: formData.get("homepageHeadline"),
        homepageDescription: formData.get("homepageDescription"),
        chairmanName: formData.get("chairmanName"),
        commitsRepository: formData.get("commitsRepository"),
        discordCommitsChannelId: formData.get("discordCommitsChannelId")
      }
    }));
  } catch {
    redirect("/settings?error=1");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export default async function SettingsPage({ searchParams }) {
  await requireAuth();
  const { settings } = await fetchPublic("/api/settings");
  const params = await searchParams;

  return (
    <PanelShell
      title="Settings"
      description="Control the homepage text, chairman name, and shared public display settings."
    >
      {params?.saved === "1" ? (
        <section className="panel-card system-banner">
          <p>Settings were saved successfully.</p>
        </section>
      ) : null}

      {params?.error === "1" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>Saving settings failed. Check file permissions and panel server logs.</p>
        </section>
      ) : null}

      <form action={saveSettingsAction} className="panel-card form-card form-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Website Settings</p>
            <h2>Public Text</h2>
          </div>
        </div>
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
        <label className="field">
          <span>Discord Commits Channel ID</span>
          <input
            defaultValue={settings.discordCommitsChannelId || ""}
            name="discordCommitsChannelId"
          />
        </label>
        <button className="button button--solid" type="submit">
          Save Settings
        </button>
      </form>
    </PanelShell>
  );
}
