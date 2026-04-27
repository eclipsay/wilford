import { fallbackCommits, filterVisibleCommits } from "@wilford/shared";

const baseUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

const fallbackContent = {
  settings: {
    homepageHeadline: "Wilford Panem Union",
    homepageEyebrow: "Welcome to",
    homepageDescription:
      "A monument to order, expansion, and industrial discipline under the leadership of Chairman Lemmie.",
    chairmanName: "Lemmie",
    commitsRepository: "eclipsay/wilford"
  },
  members: [
    {
      id: "chairman-lemmie",
      name: "Lemmie",
      role: "Chairman",
      division: "Executive Office",
      status: "Active",
      notes: "Supreme authority over the Wilford Panem Union.",
      order: 0
    }
  ],
  alliances: [],
  excommunications: [],
  enemyNations: []
};

const contentFetchOptions = () => ({
  cache: "no-store",
  signal: AbortSignal.timeout(1500)
});

export async function getSiteContent() {
  try {
    const response = await fetch(`${baseUrl}/api/content`, contentFetchOptions());

    if (!response.ok) {
      throw new Error("Failed to load content");
    }

    return response.json();
  } catch {
    return fallbackContent;
  }
}

export async function getVisibleCommits() {
  try {
    const response = await fetch(`${baseUrl}/api/commits`, contentFetchOptions());

    if (!response.ok) {
      throw new Error("Failed to load commits");
    }

    const data = await response.json();
    return filterVisibleCommits(data.commits || []);
  } catch {
    return filterVisibleCommits(fallbackCommits);
  }
}
