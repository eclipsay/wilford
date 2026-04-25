import { readFile, writeFile } from "node:fs/promises";
import { config } from "./config.js";

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
      notes: "Supreme authority over Wilford Industries."
    }
  ],
  excommunications: []
};

async function readContentFile() {
  try {
    const raw = await readFile(config.dataFile, "utf8");
    const parsed = JSON.parse(raw);

    return {
      settings: {
        ...defaultContent.settings,
        ...(parsed.settings || {})
      },
      members: parsed.members || [],
      excommunications: parsed.excommunications || []
    };
  } catch {
    return structuredClone(defaultContent);
  }
}

async function writeContentFile(content) {
  await writeFile(config.dataFile, JSON.stringify(content, null, 2));
}

export async function getContent() {
  return readContentFile();
}

export async function updateSettings(nextSettings) {
  const content = await readContentFile();
  content.settings = {
    ...content.settings,
    ...nextSettings
  };
  await writeContentFile(content);
  return content;
}

export async function createMember(member) {
  const content = await readContentFile();
  content.members.unshift(member);
  await writeContentFile(content);
  return content.members;
}

export async function deleteMember(id) {
  const content = await readContentFile();
  content.members = content.members.filter((member) => member.id !== id);
  await writeContentFile(content);
  return content.members;
}

export async function createExcommunication(entry) {
  const content = await readContentFile();
  content.excommunications.unshift(entry);
  await writeContentFile(content);
  return content.excommunications;
}

export async function deleteExcommunication(id) {
  const content = await readContentFile();
  content.excommunications = content.excommunications.filter(
    (entry) => entry.id !== id
  );
  await writeContentFile(content);
  return content.excommunications;
}
