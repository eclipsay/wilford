import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const defaultContent = {
  settings: {
    homepageHeadline: "Wilford Industries",
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
      notes: "Supreme authority over Wilford Industries.",
      order: 0
    }
  ],
  alliances: [],
  excommunications: [],
  enemyNations: [],
  panelUsers: []
};

function withNormalizedOrder(items) {
  return [...(items || [])]
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((item, index) => ({
      ...item,
      order: index
    }));
}

function resolveContentFile() {
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT
      ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json")
      : null,
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

async function readContentFile() {
  const contentFile = resolveContentFile();

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);

    return {
      settings: {
        ...defaultContent.settings,
        ...(parsed.settings || {})
      },
      members: withNormalizedOrder(parsed.members || defaultContent.members),
      alliances: withNormalizedOrder(parsed.alliances || []),
      excommunications: withNormalizedOrder(parsed.excommunications || []),
      enemyNations: withNormalizedOrder(parsed.enemyNations || []),
      panelUsers: parsed.panelUsers || []
    };
  } catch {
    return structuredClone(defaultContent);
  }
}

async function writeContentFile(content) {
  const contentFile = resolveContentFile();
  await mkdir(dirname(contentFile), { recursive: true });
  await writeFile(contentFile, JSON.stringify(content, null, 2));
}

export async function updatePanelContent(mutator) {
  const content = await readContentFile();
  const nextContent = (await mutator(content)) || content;
  await writeContentFile(nextContent);
  return nextContent;
}
