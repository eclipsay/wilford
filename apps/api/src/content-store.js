import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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
  excommunications: [],
  panelUsers: []
};

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");

  if (!salt || !hash) {
    return false;
  }

  const passwordBuffer = scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");

  if (passwordBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, hashBuffer);
}

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
      excommunications: parsed.excommunications || [],
      panelUsers: parsed.panelUsers || []
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

export function sanitizePanelUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  };
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

export async function getPanelUsers() {
  const content = await readContentFile();
  return content.panelUsers.map(sanitizePanelUser);
}

export async function createPanelUser(user) {
  const content = await readContentFile();
  const nextUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    passwordHash: hashPassword(user.password),
    createdAt: user.createdAt
  };

  content.panelUsers.unshift(nextUser);
  await writeContentFile(content);
  return content.panelUsers.map(sanitizePanelUser);
}

export async function deletePanelUser(id) {
  const content = await readContentFile();
  content.panelUsers = content.panelUsers.filter((user) => user.id !== id);
  await writeContentFile(content);
  return content.panelUsers.map(sanitizePanelUser);
}

export async function authenticatePanelUser(username, password) {
  if (
    username === config.ownerUsername &&
    config.ownerPassword &&
    password === config.ownerPassword
  ) {
    return {
      username,
      role: "owner"
    };
  }

  const content = await readContentFile();
  const user = content.panelUsers.find(
    (entry) => entry.username.toLowerCase() === String(username).toLowerCase()
  );

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    username: user.username,
    role: user.role
  };
}
