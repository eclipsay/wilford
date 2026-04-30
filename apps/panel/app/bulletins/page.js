import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PanelShell } from "../../components/PanelShell";
import { requireAdmin } from "../../lib/auth";
import { fetchAdmin } from "../../lib/api";

const bulletinCategories = [
  "Chairman",
  "Government",
  "Supreme Court",
  "MSS",
  "Ministries",
  "Industry",
  "Order",
  "Ministry of Production",
  "Ministry of Order",
  "Panem Credit",
  "Districts",
  "Eternal Engine",
  "General"
];

const bulletinPriorities = ["standard", "priority", "emergency"];

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function normalizeBulletinPayload(formData) {
  return {
    headline: String(formData.get("headline") || "").trim(),
    category: String(formData.get("category") || "General").trim(),
    priority: String(formData.get("priority") || "standard").trim(),
    active: formData.get("active") === "on",
    linkedArticleId: String(formData.get("linkedArticleId") || "").trim(),
    expiresAt: String(formData.get("expiresAt") || "").trim()
  };
}

async function createBulletinAction(formData) {
  "use server";

  await requireAdmin();

  try {
    await fetchAdmin("/api/admin/bulletins", {
      method: "POST",
      body: JSON.stringify(normalizeBulletinPayload(formData))
    });

    revalidatePath("/bulletins");
    redirect("/bulletins?saved=create");
  } catch (error) {
    redirect(
      `/bulletins?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Bulletin create failed."
      )}`
    );
  }
}

async function updateBulletinAction(formData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") || "").trim();

  try {
    await fetchAdmin(`/api/admin/bulletins/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(normalizeBulletinPayload(formData))
    });

    revalidatePath("/bulletins");
    redirect("/bulletins?saved=update");
  } catch (error) {
    redirect(
      `/bulletins?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Bulletin update failed."
      )}`
    );
  }
}

async function moveBulletinAction(formData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const direction = String(formData.get("direction") || "down").trim();

  try {
    await fetchAdmin(`/api/admin/bulletins/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: JSON.stringify({ direction })
    });

    revalidatePath("/bulletins");
    redirect("/bulletins?saved=move");
  } catch (error) {
    redirect(
      `/bulletins?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Bulletin reorder failed."
      )}`
    );
  }
}

async function deleteBulletinAction(formData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") || "").trim();

  try {
    await fetchAdmin(`/api/admin/bulletins/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    revalidatePath("/bulletins");
    redirect("/bulletins?saved=delete");
  } catch (error) {
    redirect(
      `/bulletins?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Bulletin delete failed."
      )}`
    );
  }
}

export default async function BulletinsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const [{ bulletins }, { articles }] = await Promise.all([
    fetchAdmin("/api/admin/bulletins").then((result) => ({ bulletins: result.bulletins || [] })),
    fetchAdmin("/api/admin/articles").then((result) => ({ articles: result.articles || [] }))
  ]);

  return (
    <PanelShell
      title="Bulletins"
      description="Superadmin bulletin editing inside the panel without using Government Access login."
    >
      {params?.saved ? (
        <section className="panel-card system-banner">
          <p>Bulletin registry updated: {String(params.saved)}.</p>
        </section>
      ) : null}

      {params?.error ? (
        <section className="panel-card system-banner system-banner--error">
          <p>{String(params.error)}</p>
        </section>
      ) : null}

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Panel Superadmin</p>
            <h2>Create Bulletin</h2>
          </div>
        </div>
        <form action={createBulletinAction} className="form-card">
          <label className="field">
            <span>Headline</span>
            <input name="headline" required />
          </label>
          <div className="panel-grid">
            <label className="field">
              <span>Category</span>
              <select defaultValue="General" name="category">
                {bulletinCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select defaultValue="standard" name="priority">
                {bulletinPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Expiry Date Optional</span>
              <input name="expiresAt" type="datetime-local" />
            </label>
            <label className="field">
              <span>Linked Article</span>
              <select defaultValue="" name="linkedArticleId">
                <option value="">No linked article</option>
                {articles
                  .filter((article) => article.status === "published")
                  .map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="checkbox-field">
            <input defaultChecked name="active" type="checkbox" />
            <span>Active bulletin</span>
          </label>
          <button className="button button--solid" type="submit">
            Create Bulletin
          </button>
        </form>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Existing Records</p>
            <h2>Edit Bulletins</h2>
          </div>
        </div>
        <div className="government-user-list">
          {(bulletins || []).map((bulletin, index) => (
            <article className="panel-card government-user-card" key={bulletin.id}>
              <form action={updateBulletinAction} className="form-card">
                <input name="id" type="hidden" value={bulletin.id} />
                <div className="panel-card__header">
                  <div>
                    <p className="card__kicker">
                      slot {String(index + 1).padStart(2, "0")} / {bulletin.category}
                    </p>
                    <h2>{bulletin.headline}</h2>
                  </div>
                  <span className="status-badge">
                    {bulletin.active ? bulletin.priority : "inactive"}
                  </span>
                </div>
                <label className="field">
                  <span>Headline</span>
                  <input defaultValue={bulletin.headline} name="headline" required />
                </label>
                <div className="panel-grid">
                  <label className="field">
                    <span>Category</span>
                    <select defaultValue={bulletin.category} name="category">
                      {bulletinCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Priority</span>
                    <select defaultValue={bulletin.priority} name="priority">
                      {bulletinPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Expiry Date Optional</span>
                    <input
                      defaultValue={toDateTimeLocal(bulletin.expiresAt)}
                      name="expiresAt"
                      type="datetime-local"
                    />
                  </label>
                  <label className="field">
                    <span>Linked Article</span>
                    <select defaultValue={bulletin.linkedArticleId || ""} name="linkedArticleId">
                      <option value="">No linked article</option>
                      {articles
                        .filter((article) => article.status === "published")
                        .map((article) => (
                          <option key={article.id} value={article.id}>
                            {article.title}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label className="checkbox-field">
                  <input defaultChecked={bulletin.active} name="active" type="checkbox" />
                  <span>Active bulletin</span>
                </label>
                <div className="record-actions">
                  <button className="button button--solid" type="submit">
                    Save Bulletin
                  </button>
                </div>
              </form>
              <div className="record-actions">
                <form action={moveBulletinAction}>
                  <input name="id" type="hidden" value={bulletin.id} />
                  <input name="direction" type="hidden" value="up" />
                  <button className="button button--ghost" disabled={index === 0} type="submit">
                    Move Up
                  </button>
                </form>
                <form action={moveBulletinAction}>
                  <input name="id" type="hidden" value={bulletin.id} />
                  <input name="direction" type="hidden" value="down" />
                  <button
                    className="button button--ghost"
                    disabled={index === bulletins.length - 1}
                    type="submit"
                  >
                    Move Down
                  </button>
                </form>
                <form action={deleteBulletinAction}>
                  <input name="id" type="hidden" value={bulletin.id} />
                  <button className="button button--ghost button--danger" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PanelShell>
  );
}
