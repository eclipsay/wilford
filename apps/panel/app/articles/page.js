import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PanelShell } from "../../components/PanelShell";
import { requireAdmin } from "../../lib/auth";
import { fetchAdmin } from "../../lib/api";

const articleCategories = [
  "Chairman",
  "Government",
  "Supreme Court",
  "MSS",
  "Ministries",
  "Industry",
  "Order",
  "Panem Credit",
  "Districts",
  "General"
];

const articleStatuses = ["draft", "published"];

function toDateTimeLocal(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function normalizeArticlePayload(formData) {
  return {
    title: String(formData.get("title") || "").trim(),
    subtitle: String(formData.get("subtitle") || "").trim(),
    body: String(formData.get("body") || "").trim(),
    heroImage: String(formData.get("heroImage") || "").trim(),
    category: String(formData.get("category") || "General").trim(),
    source: String(formData.get("source") || "Wilford Panem Union").trim(),
    publishDate: String(formData.get("publishDate") || new Date().toISOString()).trim(),
    status: String(formData.get("status") || "draft").trim(),
    featured: formData.get("featured") === "on"
  };
}

async function createArticleAction(formData) {
  "use server";

  await requireAdmin();

  try {
    await fetchAdmin("/api/admin/articles", {
      method: "POST",
      body: JSON.stringify(normalizeArticlePayload(formData))
    });

    revalidatePath("/articles");
    redirect("/articles?saved=create");
  } catch (error) {
    redirect(
      `/articles?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Article create failed."
      )}`
    );
  }
}

async function updateArticleAction(formData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") || "").trim();

  try {
    await fetchAdmin(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(normalizeArticlePayload(formData))
    });

    revalidatePath("/articles");
    redirect("/articles?saved=update");
  } catch (error) {
    redirect(
      `/articles?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Article update failed."
      )}`
    );
  }
}

async function deleteArticleAction(formData) {
  "use server";

  await requireAdmin();
  const id = String(formData.get("id") || "").trim();

  try {
    await fetchAdmin(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    revalidatePath("/articles");
    redirect("/articles?saved=delete");
  } catch (error) {
    redirect(
      `/articles?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Article delete failed."
      )}`
    );
  }
}

export default async function ArticlesPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const { articles } = await fetchAdmin("/api/admin/articles");

  return (
    <PanelShell
      title="Articles"
      description="Superadmin article editing inside the panel without using Government Access login."
    >
      {params?.saved ? (
        <section className="panel-card system-banner">
          <p>Article registry updated: {String(params.saved)}.</p>
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
            <h2>Create Article</h2>
          </div>
        </div>

        <form action={createArticleAction} className="form-card">
          <label className="field">
            <span>Title</span>
            <input name="title" required />
          </label>
          <label className="field">
            <span>Subtitle</span>
            <input name="subtitle" />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea name="body" required rows="10" />
          </label>
          <div className="panel-grid">
            <label className="field">
              <span>Hero Image Path or URL</span>
              <input name="heroImage" placeholder="/hero.png" />
            </label>
            <label className="field">
              <span>Category</span>
              <select defaultValue="General" name="category">
                {articleCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Source</span>
              <input defaultValue="Wilford Panem Union" name="source" />
            </label>
            <label className="field">
              <span>Publish Date</span>
              <input
                defaultValue={toDateTimeLocal(new Date().toISOString())}
                name="publishDate"
                type="datetime-local"
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select defaultValue="draft" name="status">
                {articleStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-field">
            <input name="featured" type="checkbox" />
            <span>Featured article</span>
          </label>
          <button className="button button--solid" type="submit">
            Create Article
          </button>
        </form>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Existing Records</p>
            <h2>Edit Articles</h2>
          </div>
        </div>
        <div className="government-user-list">
          {(articles || []).map((article) => (
            <article className="panel-card government-user-card" key={article.id}>
              <form action={updateArticleAction} className="form-card">
                <input name="id" type="hidden" value={article.id} />
                <div className="panel-card__header">
                  <div>
                    <p className="card__kicker">
                      {article.category} / {article.source}
                    </p>
                    <h2>{article.title}</h2>
                  </div>
                  <span className="status-badge">{article.status}</span>
                </div>
                <label className="field">
                  <span>Title</span>
                  <input defaultValue={article.title} name="title" required />
                </label>
                <label className="field">
                  <span>Subtitle</span>
                  <input defaultValue={article.subtitle} name="subtitle" />
                </label>
                <label className="field">
                  <span>Body</span>
                  <textarea defaultValue={article.body} name="body" required rows="10" />
                </label>
                <div className="panel-grid">
                  <label className="field">
                    <span>Hero Image Path or URL</span>
                    <input defaultValue={article.heroImage} name="heroImage" />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select defaultValue={article.category} name="category">
                      {articleCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Source</span>
                    <input defaultValue={article.source} name="source" />
                  </label>
                  <label className="field">
                    <span>Publish Date</span>
                    <input
                      defaultValue={toDateTimeLocal(article.publishDate)}
                      name="publishDate"
                      type="datetime-local"
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select defaultValue={article.status} name="status">
                      {articleStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="checkbox-field">
                  <input defaultChecked={article.featured} name="featured" type="checkbox" />
                  <span>Featured article</span>
                </label>
                <div className="record-actions">
                  <button className="button button--solid" type="submit">
                    Save Article
                  </button>
                  <a
                    className="button button--ghost"
                    href={`/news/${article.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View Public
                  </a>
                </div>
              </form>
              <div className="record-actions">
                <form action={deleteArticleAction}>
                  <input name="id" type="hidden" value={article.id} />
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
