import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getArticleById } from "../../../lib/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

export async function generateMetadata({ params }) {
  const { articleId } = await params;
  const article = await getArticleById(articleId);

  return {
    title: article ? `${article.title} | WPU News` : "Article | WPU News",
    description: article?.subtitle || "Official Wilford Panem Union article."
  };
}

export default async function ArticlePage({ params }) {
  const { articleId } = await params;
  const article = await getArticleById(articleId);

  if (!article) {
    notFound();
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow={`${article.category} / ${article.source}`}
        title={article.title}
        description={article.subtitle || formatDate(article.publishDate)}
      />

      <main className="content news-article-page">
        {article.heroImage ? (
          <img src={article.heroImage} alt="" className="news-article-hero-image" />
        ) : null}

        <article className="news-article-body">
          <div className="news-article-meta">
            <span>{formatDate(article.publishDate)}</span>
            <span>{article.status === "published" ? "Published" : "Draft"}</span>
          </div>
          {article.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>

        <Link className="button" href="/news">
          Back to News
        </Link>
      </main>
    </SiteLayout>
  );
}
