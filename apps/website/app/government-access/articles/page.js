import Link from "next/link";
import {
  articleCategories,
  articleStatuses,
  getAllArticles
} from "../../../lib/articles";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "Article Control | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toDateTimeLocal(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

export default async function ArticleControlPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("articleControl");
  const articles = await getAllArticles();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted State Publications"
        title="Article Control"
        description="Create, edit, publish, and withdraw official WPU articles."
      />

      <main className="content content--wide portal-page article-control-page">
        {params?.saved ? (
          <section className="application-notice">
            <strong>Article Register Updated</strong>
            <p>Publication records have been saved.</p>
          </section>
        ) : null}

        {params?.error === "required" ? (
          <section className="application-notice application-notice--error">
            <strong>Required Fields Missing</strong>
            <p>Articles require a title and body.</p>
          </section>
        ) : null}

        {params?.error === "storage" ? (
          <section className="application-notice application-notice--error">
            <strong>Article Storage Error</strong>
            <p>Article changes could not be saved to the production API.</p>
            {params?.detail ? (
              <p className="public-application-help">API detail: {String(params.detail)}</p>
            ) : null}
          </section>
        ) : null}

        <section className="panel bulletin-control-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Article Control</p>
              <h2>Add New Article</h2>
              <p className="public-application-help">Authenticated as {user.username} / {user.role}</p>
            </div>
            <Link className="button" href="/government-access">Dashboard</Link>
          </div>

          <form action="/government-access/articles/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="add" />
            <label className="public-application-field">
              <span>Title</span>
              <input name="title" required type="text" />
            </label>
            <label className="public-application-field">
              <span>Subtitle</span>
              <input name="subtitle" type="text" />
            </label>
            <label className="public-application-field">
              <span>Body</span>
              <textarea name="body" required rows="10" />
            </label>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Hero Image Path or URL</span>
                <input name="heroImage" placeholder="/hero.png" type="text" />
              </label>
              <label className="public-application-field">
                <span>Category</span>
                <select defaultValue="General" name="category">
                  {articleCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Source</span>
                <input defaultValue="Wilford Panem Union" name="source" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Publish Date</span>
                <input defaultValue={toDateTimeLocal(new Date().toISOString())} name="publishDate" type="datetime-local" />
              </label>
              <label className="public-application-field">
                <span>Status</span>
                <select defaultValue="draft" name="status">
                  {articleStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-toggle article-feature-toggle">
                <input name="featured" type="checkbox" />
                <span>Featured article</span>
              </label>
            </div>
            <button className="button button--solid-site" type="submit">
              Add Article
            </button>
          </form>
        </section>

        <section className="bulletin-editor-list" aria-label="Current article items">
          {articles.length ? (
            articles.map((article) => (
              <article className="panel bulletin-editor-card article-editor-card" key={article.id}>
                <form action="/government-access/articles/action" className="public-application-form" method="post">
                  <input name="intent" type="hidden" value="update" />
                  <input name="id" type="hidden" value={article.id} />
                  <div className="panel__header bulletin-editor-card__header">
                    <div>
                      <p className="eyebrow">{article.category} / {article.source}</p>
                      <h2>{article.title}</h2>
                      <p className="bulletin-editor-card__subtitle">{article.subtitle}</p>
                    </div>
                    <div className="bulletin-editor-card__status">
                      <span>{article.featured ? "Featured" : "Standard"}</span>
                      <strong>{article.status}</strong>
                    </div>
                  </div>

                  <label className="public-application-field">
                    <span>Title</span>
                    <input defaultValue={article.title} name="title" required type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Subtitle</span>
                    <input defaultValue={article.subtitle} name="subtitle" type="text" />
                  </label>
                  <label className="public-application-field">
                    <span>Body</span>
                    <textarea defaultValue={article.body} name="body" required rows="10" />
                  </label>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Hero Image Path or URL</span>
                      <input defaultValue={article.heroImage} name="heroImage" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Category</span>
                      <select defaultValue={article.category} name="category">
                        {articleCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Source</span>
                      <input defaultValue={article.source} name="source" type="text" />
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Publish Date</span>
                      <input defaultValue={toDateTimeLocal(article.publishDate)} name="publishDate" type="datetime-local" />
                    </label>
                    <label className="public-application-field">
                      <span>Status</span>
                      <select defaultValue={article.status} name="status">
                        {articleStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-toggle article-feature-toggle">
                      <input defaultChecked={article.featured} name="featured" type="checkbox" />
                      <span>Featured article</span>
                    </label>
                  </div>
                  <div className="bulletin-editor-card__actions">
                    <button className="button button--solid-site" type="submit">
                      Save Article
                    </button>
                    <Link className="button" href={`/news/${article.id}`}>View Public</Link>
                  </div>
                </form>
                <div className="bulletin-editor-card__actions">
                  <form action="/government-access/articles/action" method="post">
                    <input name="intent" type="hidden" value="delete" />
                    <input name="id" type="hidden" value={article.id} />
                    <button className="button button--danger-site" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <section className="panel bulletin-restricted-panel">
              <p className="eyebrow">No Articles</p>
              <h2>No article records have been entered.</h2>
            </section>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
