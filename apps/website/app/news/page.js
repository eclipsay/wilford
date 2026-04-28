import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { articleUrl, getPublishedArticles } from "../../lib/articles";

export const metadata = {
  title: "News | Wilford Panem Union",
  description: "Official WPU articles, notices, and state publications."
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default async function NewsPage() {
  const articles = await getPublishedArticles();
  const featured = articles.find((article) => article.featured) || articles[0];
  const rest = featured ? articles.filter((article) => article.id !== featured.id) : articles;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Official State Publications"
        title="WPU News"
        description="Articles, communiques, and formal notices of the Wilford Panem Union."
      />

      <main className="content content--wide news-page">
        {featured ? (
          <Link className="news-featured" href={articleUrl(featured)}>
            {featured.heroImage ? (
              <img src={featured.heroImage} alt="" className="news-featured__image" />
            ) : null}
            <div className="news-featured__copy">
              <p className="eyebrow">{featured.category} / {featured.source}</p>
              <h2>{featured.title}</h2>
              <p>{featured.subtitle}</p>
              <span>{formatDate(featured.publishDate)}</span>
            </div>
          </Link>
        ) : (
          <section className="panel bulletin-restricted-panel">
            <p className="eyebrow">News Register</p>
            <h2>No published articles are available.</h2>
          </section>
        )}

        {rest.length ? (
          <section className="news-grid" aria-label="Published articles">
            {rest.map((article) => (
              <Link className="news-card" href={articleUrl(article)} key={article.id}>
                {article.heroImage ? (
                  <img src={article.heroImage} alt="" className="news-card__image" />
                ) : null}
                <div className="news-card__copy">
                  <span>{article.category}</span>
                  <h2>{article.title}</h2>
                  <p>{article.subtitle}</p>
                  <strong>{formatDate(article.publishDate)}</strong>
                </div>
              </Link>
            ))}
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
