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
    commitsRepository: "eclipsay/wilford",
    discordCommitsChannelId: ""
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
  panelUsers: [],
  cryptoLogs: [],
  publicApplications: []
};

function withNormalizedOrder(items) {
  return [...(items || [])]
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((item, index) => ({
      ...item,
      order: index
    }));
}

function withReindexedOrder(items) {
  return [...(items || [])].map((item, index) => ({
    ...item,
    order: index
  }));
}

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
      members: withNormalizedOrder(parsed.members || defaultContent.members),
      alliances: withNormalizedOrder(parsed.alliances || []),
      excommunications: withNormalizedOrder(parsed.excommunications || []),
      enemyNations: withNormalizedOrder(parsed.enemyNations || []),
      panelUsers: parsed.panelUsers || [],
      cryptoLogs: parsed.cryptoLogs || [],
      publicApplications: parsed.publicApplications || []
    };
  } catch {
    return structuredClone(defaultContent);
  }
}

async function writeContentFile(content) {
  await writeFile(config.dataFile, JSON.stringify(content, null, 2));
}

function addOrderedItem(items, item) {
  return withNormalizedOrder([item, ...items]);
}

function deleteOrderedItem(items, id) {
  return withNormalizedOrder(items.filter((item) => item.id !== id));
}

function moveOrderedItem(items, id, direction) {
  const normalized = withNormalizedOrder(items);
  const index = normalized.findIndex((item) => item.id === id);

  if (index === -1) {
    return normalized;
  }

  const targetIndex =
    direction === "up" ? Math.max(0, index - 1) : Math.min(normalized.length - 1, index + 1);

  if (targetIndex === index) {
    return normalized;
  }

  const next = [...normalized];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return withReindexedOrder(next);
}

function setOrderedItemPosition(items, id, targetIndex) {
  const normalized = withNormalizedOrder(items);
  const index = normalized.findIndex((item) => item.id === id);

  if (index === -1) {
    return normalized;
  }

  const boundedTargetIndex = Math.max(
    0,
    Math.min(normalized.length - 1, Number(targetIndex) || 0)
  );

  if (boundedTargetIndex === index) {
    return normalized;
  }

  const next = [...normalized];
  const [item] = next.splice(index, 1);
  next.splice(boundedTargetIndex, 0, item);
  return withReindexedOrder(next);
}

function reorderOrderedItems(items, orderedIds) {
  const normalized = withNormalizedOrder(items);
  const byId = new Map(normalized.map((item) => [item.id, item]));
  const reordered = [];

  for (const id of orderedIds || []) {
    const item = byId.get(id);

    if (item) {
      reordered.push(item);
      byId.delete(id);
    }
  }

  for (const item of normalized) {
    if (byId.has(item.id)) {
      reordered.push(item);
    }
  }

  return withReindexedOrder(reordered);
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
  content.members = addOrderedItem(content.members, member);
  await writeContentFile(content);
  return content.members;
}

export async function deleteMember(id) {
  const content = await readContentFile();
  content.members = deleteOrderedItem(content.members, id);
  await writeContentFile(content);
  return content.members;
}

export async function moveMember(id, direction) {
  const content = await readContentFile();
  content.members = moveOrderedItem(content.members, id, direction);
  await writeContentFile(content);
  return content.members;
}

export async function updateMemberPosition(id, targetIndex) {
  const content = await readContentFile();
  content.members = setOrderedItemPosition(content.members, id, targetIndex);
  await writeContentFile(content);
  return content.members;
}

export async function reorderMembers(orderedIds) {
  const content = await readContentFile();
  content.members = reorderOrderedItems(content.members, orderedIds);
  await writeContentFile(content);
  return content.members;
}

export async function replaceMembers(nextMembers) {
  const content = await readContentFile();
  content.members = withReindexedOrder(nextMembers || []);
  await writeContentFile(content);
  return content.members;
}

export async function createAlliance(entry) {
  const content = await readContentFile();
  content.alliances = addOrderedItem(content.alliances, entry);
  await writeContentFile(content);
  return content.alliances;
}

export async function deleteAlliance(id) {
  const content = await readContentFile();
  content.alliances = deleteOrderedItem(content.alliances, id);
  await writeContentFile(content);
  return content.alliances;
}

export async function moveAlliance(id, direction) {
  const content = await readContentFile();
  content.alliances = moveOrderedItem(content.alliances, id, direction);
  await writeContentFile(content);
  return content.alliances;
}

export async function updateAlliancePosition(id, targetIndex) {
  const content = await readContentFile();
  content.alliances = setOrderedItemPosition(
    content.alliances,
    id,
    targetIndex
  );
  await writeContentFile(content);
  return content.alliances;
}

export async function reorderAlliances(orderedIds) {
  const content = await readContentFile();
  content.alliances = reorderOrderedItems(content.alliances, orderedIds);
  await writeContentFile(content);
  return content.alliances;
}

export async function replaceAlliances(nextAlliances) {
  const content = await readContentFile();
  content.alliances = withReindexedOrder(nextAlliances || []);
  await writeContentFile(content);
  return content.alliances;
}

export async function createExcommunication(entry) {
  const content = await readContentFile();
  content.excommunications = addOrderedItem(content.excommunications, entry);
  await writeContentFile(content);
  return content.excommunications;
}

export async function deleteExcommunication(id) {
  const content = await readContentFile();
  content.excommunications = deleteOrderedItem(content.excommunications, id);
  await writeContentFile(content);
  return content.excommunications;
}

export async function moveExcommunication(id, direction) {
  const content = await readContentFile();
  content.excommunications = moveOrderedItem(
    content.excommunications,
    id,
    direction
  );
  await writeContentFile(content);
  return content.excommunications;
}

export async function reorderExcommunications(orderedIds) {
  const content = await readContentFile();
  content.excommunications = reorderOrderedItems(
    content.excommunications,
    orderedIds
  );
  await writeContentFile(content);
  return content.excommunications;
}

export async function createEnemyNation(entry) {
  const content = await readContentFile();
  content.enemyNations = addOrderedItem(content.enemyNations, entry);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function deleteEnemyNation(id) {
  const content = await readContentFile();
  content.enemyNations = deleteOrderedItem(content.enemyNations, id);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function moveEnemyNation(id, direction) {
  const content = await readContentFile();
  content.enemyNations = moveOrderedItem(content.enemyNations, id, direction);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function reorderEnemyNations(orderedIds) {
  const content = await readContentFile();
  content.enemyNations = reorderOrderedItems(content.enemyNations, orderedIds);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function getPanelUsers() {
  const content = await readContentFile();
  return content.panelUsers.map(sanitizePanelUser);
}

export async function appendCryptoLog(entry) {
  const content = await readContentFile();
  const nextEntry = {
    id:
      entry.id ||
      `crypto-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    action: String(entry.action || "").trim().toLowerCase(),
    createdAt: entry.createdAt || new Date().toISOString(),
    source: entry.source || "website",
    messagePreview: String(entry.messagePreview || "").trim(),
    encryptedPreview: String(entry.encryptedPreview || "").trim()
  };

  content.cryptoLogs = [nextEntry, ...(content.cryptoLogs || [])].slice(0, 250);
  await writeContentFile(content);
  return content.cryptoLogs;
}

export async function createPublicApplication(entry) {
  const content = await readContentFile();
  const application = {
    id:
      entry.id ||
      `application-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    source: entry.source || "website",
    status: entry.status || "pending",
    submittedAt: entry.submittedAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    applicantName: String(entry.applicantName || "").trim(),
    age: String(entry.age || "").trim(),
    timezone: String(entry.timezone || "").trim(),
    motivation: String(entry.motivation || "").trim(),
    experience: String(entry.experience || "").trim(),
    discordHandle: String(entry.discordHandle || "").trim(),
    discordUserId: String(entry.discordUserId || "").trim(),
    email: String(entry.email || "").trim(),
    reviewThreadId: String(entry.reviewThreadId || "").trim(),
    reviewMessageId: String(entry.reviewMessageId || "").trim(),
    reviewGuildId: String(entry.reviewGuildId || "").trim(),
    decisionNote: String(entry.decisionNote || "").trim()
  };

  content.publicApplications = [application, ...(content.publicApplications || [])].slice(0, 500);
  await writeContentFile(content);
  return application;
}

export async function getPendingPublicApplications() {
  const content = await readContentFile();
  return (content.publicApplications || []).filter(
    (application) =>
      application.status === "pending" &&
      !String(application.reviewThreadId || "").trim()
  );
}

export async function updatePublicApplication(id, nextFields) {
  const content = await readContentFile();
  let updatedApplication = null;

  content.publicApplications = (content.publicApplications || []).map((application) => {
    if (application.id !== id) {
      return application;
    }

    updatedApplication = {
      ...application,
      ...nextFields,
      updatedAt: new Date().toISOString()
    };
    return updatedApplication;
  });

  await writeContentFile(content);
  return updatedApplication;
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
