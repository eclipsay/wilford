import {
  bulletinCategories,
  bulletinPriorities,
  getAllBulletins,
  getBulletinSourceMeta,
} from "../../../lib/bulletins";
import { getPublishedArticles } from "../../../lib/articles";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";
import { broadcastDistributions, broadcastTypes } from "../../../lib/discord-broadcasts";

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

function DiscordBroadcastFields() {
  return (
    <fieldset className="broadcast-fieldset">
      <legend>Discord Broadcast Optional</legend>
      <label className="public-application-field">
        <span>Delivery</span>
        <select defaultValue="none" name="discordDistribution">
          {broadcastDistributions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="public-application-field">
        <span>Broadcast type</span>
        <select defaultValue="news" name="broadcastType">
          {broadcastTypes.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <div className="public-application-grid public-application-grid--two">
        <label className="public-application-field">
          <span>Specific Discord User ID</span>
          <input name="targetDiscordId" placeholder="Required only for specific Discord ID" type="text" />
        </label>
        <label className="public-application-toggle">
          <input name="confirmDiscordBroadcast" type="checkbox" />
          <span>Submit dangerous broadcast for Chairman approval</span>
        </label>
      </div>
      <p className="public-application-help">
        DM-all and Enemy of the State notices become Chairman approval requests before delivery.
      </p>
    </fieldset>
  );
}

export const metadata = {
  title: "Bulletin Control | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BulletinControlPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("bulletinControl");
  const bulletins = await getAllBulletins();
  const articles = await getPublishedArticles().catch(() => []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted State Communications"
        title="Bulletin Control"
        description="Create and maintain public WPU News Bulletin directives."
      />

      <main className="content content--wide portal-page bulletin-control-page">
        {
          <>
            {params?.saved ? (
              <section className="application-notice">
                <strong>Bulletin Register Updated</strong>
                <p>Public ticker records have been saved{params?.broadcast ? " and Discord delivery has been queued." : "."}</p>
              </section>
            ) : null}

            {params?.error === "headline" ? (
              <section className="application-notice application-notice--error">
                <strong>Headline Required</strong>
                <p>Bulletins must include official headline text.</p>
              </section>
            ) : null}

            {params?.error === "storage" ? (
              <section className="application-notice application-notice--error">
                <strong>Bulletin Storage Error</strong>
                <p>
                  Bulletin changes could not be saved. Confirm the website has
                  API_URL and BULLETIN_API_KEY or ADMIN_API_KEY configured for
                  the production API.
                </p>
                {params?.detail ? (
                  <p className="public-application-help">
                    API detail: {String(params.detail)}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="panel bulletin-control-panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Bulletin Control</p>
                  <h2>Add New Bulletin</h2>
                  <p className="public-application-help">Authenticated as {user.username} / {user.role}</p>
                </div>
                <a className="button" href="/government-access">Dashboard</a>
              </div>

              <form action="/government-access/bulletins/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="add" />
                <label className="public-application-field">
                  <span>Headline Text</span>
                  <input name="headline" required type="text" />
                </label>
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field">
                    <span>Category</span>
                    <select defaultValue="General" name="category">
                      {bulletinCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="public-application-field">
                    <span>Priority</span>
                    <select defaultValue="standard" name="priority">
                      {bulletinPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="public-application-field">
                    <span>Expiry Date Optional</span>
                    <input name="expiresAt" type="datetime-local" />
                  </label>
                </div>
                <label className="public-application-toggle">
                  <input defaultChecked name="active" type="checkbox" />
                  <span>Active bulletin</span>
                </label>
                <label className="public-application-field">
                  <span>Linked Article Optional</span>
                  <select defaultValue="" name="linkedArticleId">
                    <option value="">No linked article</option>
                    {articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.title}
                      </option>
                    ))}
                  </select>
                </label>
                <DiscordBroadcastFields />
                <button className="button button--solid-site" type="submit">
                  Add Bulletin
                </button>
              </form>
            </section>

            <section className="bulletin-editor-list" aria-label="Current bulletin items">
              {bulletins.length ? (
                bulletins.map((bulletin, index) => {
                  const source = getBulletinSourceMeta(bulletin.category);
                  const showPriorityBadge = bulletin.priority !== "standard";

                  return (
                    <article
                      className={`panel bulletin-editor-card bulletin-editor-card--${bulletin.priority} bulletin-editor-card--source-${source.className}`}
                      key={bulletin.id}
                    >
                    <form action="/government-access/bulletins/action" className="public-application-form" method="post">
                      <input name="intent" type="hidden" value="update" />
                      <input name="id" type="hidden" value={bulletin.id} />
                      <div className="panel__header bulletin-editor-card__header">
                        <div className="bulletin-editor-card__identity">
                          <span className="bulletin-editor-card__seal" aria-label={source.seal}>
                            {source.icon}
                          </span>
                          <div>
                            <p className="eyebrow">
                              {String(index + 1).padStart(2, "0")} / {source.title}
                            </p>
                            <h2>{bulletin.headline}</h2>
                            <p className="bulletin-editor-card__subtitle">
                              {source.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="bulletin-editor-card__status">
                          {showPriorityBadge ? (
                            <span className="bulletin-editor-card__priority-badge">
                              {source.priorityLabel}
                            </span>
                          ) : (
                            <span>{bulletin.category}</span>
                          )}
                          <strong>{bulletin.active ? "Active" : "Inactive"}</strong>
                        </div>
                      </div>

                      <label className="public-application-field">
                        <span>Headline Text</span>
                        <input defaultValue={bulletin.headline} name="headline" required type="text" />
                      </label>

                      <div className="public-application-grid public-application-grid--three">
                        <label className="public-application-field">
                          <span>Category</span>
                          <select defaultValue={bulletin.category} name="category">
                            {bulletinCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="public-application-field">
                          <span>Priority</span>
                          <select defaultValue={bulletin.priority} name="priority">
                            {bulletinPriorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="public-application-field">
                          <span>Expiry Date Optional</span>
                          <input
                            defaultValue={toDateTimeLocal(bulletin.expiresAt)}
                            name="expiresAt"
                            type="datetime-local"
                          />
                        </label>
                      </div>

                      <label className="public-application-toggle">
                        <input defaultChecked={bulletin.active} name="active" type="checkbox" />
                        <span>Active bulletin</span>
                      </label>

                      <label className="public-application-field">
                        <span>Linked Article Optional</span>
                        <select defaultValue={bulletin.linkedArticleId || ""} name="linkedArticleId">
                          <option value="">No linked article</option>
                          {articles.map((article) => (
                            <option key={article.id} value={article.id}>
                              {article.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <DiscordBroadcastFields />

                      <div className="bulletin-editor-card__actions">
                        <button className="button button--solid-site" type="submit">
                          Save Bulletin
                        </button>
                      </div>
                    </form>

                    <div className="bulletin-editor-card__actions">
                      <form action="/government-access/bulletins/action" method="post">
                        <input name="intent" type="hidden" value="move" />
                        <input name="id" type="hidden" value={bulletin.id} />
                        <input name="direction" type="hidden" value="up" />
                        <button className="button" disabled={index === 0} type="submit">
                          Move Up
                        </button>
                      </form>
                      <form action="/government-access/bulletins/action" method="post">
                        <input name="intent" type="hidden" value="move" />
                        <input name="id" type="hidden" value={bulletin.id} />
                        <input name="direction" type="hidden" value="down" />
                        <button className="button" disabled={index === bulletins.length - 1} type="submit">
                          Move Down
                        </button>
                      </form>
                      <form action="/government-access/bulletins/action" method="post">
                        <input name="intent" type="hidden" value="delete" />
                        <input name="id" type="hidden" value={bulletin.id} />
                        <button className="button button--danger-site" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                    </article>
                  );
                })
              ) : (
                <section className="panel bulletin-restricted-panel">
                  <p className="eyebrow">No Active Register</p>
                  <h2>No bulletins have been entered.</h2>
                </section>
              )}
            </section>
          </>
        }
      </main>
    </SiteLayout>
  );
}
