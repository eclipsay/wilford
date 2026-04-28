import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

export const articleCategories = [
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

export const articleStatuses = ["draft", "published"];

const defaultArticles = [
  {
    id: "article-union-continuity",
    title: "Union Continuity Programme Announced",
    subtitle: "The Government confirms coordinated measures for order, production, and civic service.",
    body:
      "The Wilford Panem Union has opened a new continuity programme across ministries, district offices, and civic registries. The programme aligns public service, production readiness, and citizen support under one central standard of national duty.\n\nOfficials confirmed that additional directives will be published as ministries complete their operating reviews.",
    heroImage: "/hero.png",
    category: "Government",
    source: "Wilford Panem Union",
    publishDate: "2026-04-27T00:00:00.000Z",
    status: "published",
    featured: true,
    createdAt: "2026-04-27T00:00:00.000Z",
    updatedAt: "2026-04-27T00:00:00.000Z"
  }
];

function resolveContentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT
      ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json")
      : null,
    resolve(currentDir, "../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

function resolveServerlessWritableFile() {
  return resolve(tmpdir(), "wilford-articles-content.json");
}

function slugFromTitle(value) {
  return String(value || "article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function articleUrl(article) {
  return `/news/${encodeURIComponent(article.id)}`;
}

function normalizeArticle(entry, index) {
  const now = new Date().toISOString();
  const category = String(entry?.category || "General").trim();
  const status = String(entry?.status || "draft").toLowerCase();
  const title = String(entry?.title || "").replace(/\s+/g, " ").trim();

  return {
    id: String(entry?.id || `article-${slugFromTitle(title)}-${index}`),
    title,
    subtitle: String(entry?.subtitle || "").replace(/\s+/g, " ").trim(),
    body: String(entry?.body || "").trim(),
    heroImage: String(entry?.heroImage || "").trim(),
    category: articleCategories.includes(category) ? category : "General",
    source: String(entry?.source || "Wilford Panem Union").replace(/\s+/g, " ").trim(),
    publishDate: String(entry?.publishDate || entry?.createdAt || now).trim(),
    status: articleStatuses.includes(status) ? status : "draft",
    featured: Boolean(entry?.featured),
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now
  };
}

function normalizeArticles(items) {
  return [...(items || [])]
    .map(normalizeArticle)
    .filter((item) => item.title && item.body)
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
}

async function readContentFile() {
  try {
    const response = await fetch(`${baseUrl}/api/content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      const parsed = await response.json();
      return {
        ...parsed,
        articles: normalizeArticles(parsed.articles || defaultArticles)
      };
    }
  } catch {}

  const contentFile = resolveContentFile();
  const fallbackFile = resolveServerlessWritableFile();

  try {
    const raw = await readFile(fallbackFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      articles: normalizeArticles(parsed.articles || defaultArticles)
    };
  } catch {}

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      articles: normalizeArticles(parsed.articles || defaultArticles)
    };
  } catch {
    return {
      articles: normalizeArticles(defaultArticles)
    };
  }
}

async function writeLocalContentFile(content) {
  const contentFile = resolveContentFile();
  const payload = JSON.stringify(content, null, 2);

  try {
    await mkdir(dirname(contentFile), { recursive: true });
    await writeFile(contentFile, payload);
    return;
  } catch {}

  const fallbackFile = resolveServerlessWritableFile();
  await mkdir(dirname(fallbackFile), { recursive: true });
  await writeFile(fallbackFile, payload);
}

async function requestAdminArticles(path, options = {}) {
  const adminKey = process.env.ARTICLE_API_KEY || process.env.BULLETIN_API_KEY || process.env.ADMIN_API_KEY;
  const requestUrl = `${baseUrl}${path}`;

  if (!adminKey) {
    throw new Error("Missing ARTICLE_API_KEY or ADMIN_API_KEY in the website environment.");
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      ...(options.headers || {})
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Article API request failed: ${requestUrl} returned ${response.status}.`);
  }

  const data = await response.json();
  return normalizeArticles(data.articles || []);
}

export async function getAllArticles() {
  try {
    return await requestAdminArticles("/api/admin/articles");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  return normalizeArticles(content.articles);
}

export async function getPublishedArticles() {
  const content = await readContentFile();
  const articles = normalizeArticles(content.articles);
  return articles.filter((article) => article.status === "published");
}

export async function getArticleById(id, includeDrafts = false) {
  const articles = includeDrafts ? await getAllArticles() : await getPublishedArticles();
  return articles.find((article) => article.id === id) || null;
}

export async function createArticle(fields) {
  try {
    return await requestAdminArticles("/api/admin/articles", {
      method: "POST",
      body: JSON.stringify(fields)
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  const now = new Date().toISOString();
  const article = normalizeArticle(
    {
      id: `article-${slugFromTitle(fields.title)}-${Date.now().toString(36)}`,
      ...fields,
      createdAt: now,
      updatedAt: now
    },
    0
  );

  content.articles = normalizeArticles([article, ...(content.articles || [])]);
  await writeLocalContentFile(content);
  return content.articles;
}

export async function updateArticle(id, fields) {
  try {
    return await requestAdminArticles(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(fields)
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  const now = new Date().toISOString();

  content.articles = normalizeArticles(
    (content.articles || []).map((article) =>
      article.id === id
        ? normalizeArticle(
            {
              ...article,
              ...fields,
              id: article.id,
              createdAt: article.createdAt,
              updatedAt: now
            },
            0
          )
        : article
    )
  );

  await writeLocalContentFile(content);
  return content.articles;
}

export async function deleteArticle(id) {
  try {
    return await requestAdminArticles(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  content.articles = normalizeArticles((content.articles || []).filter((article) => article.id !== id));
  await writeLocalContentFile(content);
  return content.articles;
}

export function parseArticleForm(formData) {
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
