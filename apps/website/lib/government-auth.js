import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const governmentSessionCookie = "wpu_government_session";

export const accessRoles = [
  "Supreme Authority",
  "Executive Command",
  "Ministry Command",
  "MSS Command",
  "Court Official",
  "Government Official",
  "Citizen Clerk",
  "Read-Only Observer"
];

export const permissions = {
  dashboard: accessRoles,
  bulletinControl: [
    "Supreme Authority",
    "Executive Command",
    "Ministry Command",
    "Government Official"
  ],
  supremeCourtControl: ["Supreme Authority", "Executive Command", "Court Official"],
  mssTools: ["Supreme Authority", "Executive Command", "MSS Command"],
  citizenshipReview: [
    "Supreme Authority",
    "Executive Command",
    "Citizen Clerk",
    "Government Official"
  ],
  userControl: ["Supreme Authority", "Executive Command"],
  auditLog: ["Supreme Authority", "Executive Command"]
};

const devTemporaryPassword = "WPU-DEV-CHANGE-ME";

const seedUsers = [
  ["chairman", "Chairman", "Supreme Authority"],
  ["eclip", "Eclip", "Executive Command"],
  ["flukkston", "Flukkston", "Executive Command"],
  ["mss_command", "MSS Command", "MSS Command"],
  ["court_clerk", "Court Clerk", "Court Official"]
].map(([username, displayName, role], index) => ({
  id: `dev-user-${index + 1}`,
  username,
  displayName,
  role,
  active: true,
  forcePasswordChange: true,
  passwordHash: hashPassword(devTemporaryPassword),
  createdAt: "2026-04-27T00:00:00.000Z",
  lastLoginAt: "",
  notes: "Development seed user. Replace temporary password immediately."
}));

export const developmentPasswordNotice =
  "Development seed users use temporary password WPU-DEV-CHANGE-ME and are marked for replacement.";

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

function authSecret() {
  return (
    process.env.GOVERNMENT_AUTH_SECRET ||
    process.env.PANEL_SESSION_SECRET ||
    process.env.ADMIN_API_KEY ||
    "WPU-DEVELOPMENT-GOVERNMENT-AUTH-SECRET"
  );
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(String(password || ""), salt, 210000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$210000$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [scheme, iterations, salt, hash] = String(storedHash || "").split("$");

  if (scheme !== "pbkdf2_sha256" || !iterations || !salt || !hash) {
    return false;
  }

  const next = pbkdf2Sync(String(password || ""), salt, Number(iterations), 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === next.length && timingSafeEqual(expected, next);
}

function normalizeUser(user, index) {
  const role = accessRoles.includes(user?.role) ? user.role : "Read-Only Observer";

  return {
    id: String(user?.id || `user-${Date.now().toString(36)}-${index}`),
    username: String(user?.username || "").trim().toLowerCase(),
    displayName: String(user?.displayName || user?.username || "").trim(),
    role,
    active: user?.active !== false,
    forcePasswordChange: Boolean(user?.forcePasswordChange),
    passwordHash: String(user?.passwordHash || "").trim(),
    createdAt: user?.createdAt || new Date().toISOString(),
    lastLoginAt: user?.lastLoginAt || "",
    notes: String(user?.notes || "").trim()
  };
}

function normalizeAudit(entry, index) {
  return {
    id: String(entry?.id || `audit-${index}`),
    at: entry?.at || new Date().toISOString(),
    actor: String(entry?.actor || "system").trim(),
    action: String(entry?.action || "event").trim(),
    detail: String(entry?.detail || "").trim(),
    status: String(entry?.status || "info").trim()
  };
}

async function readContentFile() {
  const contentFile = resolveContentFile();

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      governmentUsers: (parsed.governmentUsers || seedUsers).map(normalizeUser),
      governmentAuditLog: (parsed.governmentAuditLog || []).map(normalizeAudit)
    };
  } catch {
    return {
      governmentUsers: seedUsers.map(normalizeUser),
      governmentAuditLog: []
    };
  }
}

async function writeContentFile(content) {
  const contentFile = resolveContentFile();
  await mkdir(dirname(contentFile), { recursive: true });
  await writeFile(contentFile, JSON.stringify(content, null, 2));
}

async function writeAudit(content, actor, action, detail, status = "info") {
  content.governmentAuditLog = [
    {
      id: `audit-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
      at: new Date().toISOString(),
      actor: actor || "system",
      action,
      detail,
      status
    },
    ...(content.governmentAuditLog || [])
  ].slice(0, 300);
}

export async function addAuditEvent(actor, action, detail, status = "info") {
  const content = await readContentFile();
  await writeAudit(content, actor, action, detail, status);
  await writeContentFile(content);
}

function sign(payload) {
  return createHmac("sha256", authSecret()).update(payload).digest("hex");
}

function createSessionValue(username) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      expiresAt: Date.now() + 1000 * 60 * 60 * 8
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSessionValue(value) {
  const [payload, signature] = String(value || "").split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function getGovernmentUsers() {
  const content = await readContentFile();
  return content.governmentUsers;
}

export async function getAuditLog() {
  const content = await readContentFile();
  return content.governmentAuditLog;
}

export async function getCurrentGovernmentUser() {
  const store = await cookies();
  const session = readSessionValue(store.get(governmentSessionCookie)?.value);

  if (!session?.username) {
    return null;
  }

  const users = await getGovernmentUsers();
  const user = users.find((item) => item.username === session.username && item.active);
  return user || null;
}

export function canAccess(user, permission) {
  return Boolean(user && permissions[permission]?.includes(user.role));
}

export async function requireGovernmentUser(permission = "dashboard") {
  const user = await getCurrentGovernmentUser();

  if (!user) {
    redirect("/government-access/login");
  }

  if (user.forcePasswordChange && permission !== "dashboard") {
    redirect("/government-access/change-password");
  }

  if (!canAccess(user, permission)) {
    await addAuditEvent(user.username, "access denied", `Denied ${permission}`, "denied");
    redirect("/government-access?denied=1");
  }

  return user;
}

export async function loginGovernmentUser(username, password) {
  const content = await readContentFile();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const user = content.governmentUsers.find((item) => item.username === normalizedUsername);

  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    await writeAudit(content, normalizedUsername || "unknown", "failed login", "Invalid credentials", "failed");
    await writeContentFile(content);
    return { ok: false };
  }

  const now = new Date().toISOString();
  content.governmentUsers = content.governmentUsers.map((item) =>
    item.username === user.username ? { ...item, lastLoginAt: now } : item
  );
  await writeAudit(content, user.username, "successful login", "Government Access login", "success");
  await writeContentFile(content);

  const store = await cookies();
  store.set(governmentSessionCookie, createSessionValue(user.username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/government-access",
    maxAge: 60 * 60 * 8
  });

  return { ok: true, forcePasswordChange: user.forcePasswordChange };
}

export async function logoutGovernmentUser() {
  const store = await cookies();
  store.set(governmentSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/government-access",
    maxAge: 0
  });
}

export async function changeOwnPassword(username, currentPassword, newPassword) {
  const content = await readContentFile();
  const user = content.governmentUsers.find((item) => item.username === username);

  if (!user || !verifyPassword(currentPassword, user.passwordHash) || String(newPassword || "").length < 8) {
    await writeAudit(content, username, "password change failed", "Rejected password change", "failed");
    await writeContentFile(content);
    return false;
  }

  content.governmentUsers = content.governmentUsers.map((item) =>
    item.username === username
      ? {
          ...item,
          passwordHash: hashPassword(newPassword),
          forcePasswordChange: false
        }
      : item
  );
  await writeAudit(content, username, "password changed", "User changed temporary password", "success");
  await writeContentFile(content);
  return true;
}

export async function createGovernmentUser(actor, fields) {
  const content = await readContentFile();
  const username = String(fields.username || "").trim().toLowerCase();
  const password = String(fields.temporaryPassword || "").trim() || generateTemporaryPassword();

  if (!username || content.governmentUsers.some((item) => item.username === username)) {
    return { ok: false };
  }

  const user = normalizeUser(
    {
      id: `user-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
      username,
      displayName: fields.displayName,
      role: fields.role,
      active: true,
      forcePasswordChange: true,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: "",
      notes: fields.notes
    },
    content.governmentUsers.length
  );

  content.governmentUsers = [...content.governmentUsers, user];
  await writeAudit(content, actor.username, "user created", username, "success");
  await writeContentFile(content);
  return { ok: true, temporaryPassword: password };
}

export async function updateGovernmentUser(actor, username, fields) {
  const content = await readContentFile();
  content.governmentUsers = content.governmentUsers.map((item) =>
    item.username === username
      ? normalizeUser(
          {
            ...item,
            displayName: fields.displayName,
            role: fields.role,
            active: fields.active,
            forcePasswordChange: fields.forcePasswordChange,
            notes: fields.notes
          },
          0
        )
      : item
  );
  await writeAudit(content, actor.username, "user edited", username, "success");
  await writeContentFile(content);
}

export async function disableGovernmentUser(actor, username) {
  const content = await readContentFile();
  content.governmentUsers = content.governmentUsers.map((item) =>
    item.username === username ? { ...item, active: false } : item
  );
  await writeAudit(content, actor.username, "user disabled", username, "success");
  await writeContentFile(content);
}

export async function deleteGovernmentUser(actor, username) {
  const content = await readContentFile();
  content.governmentUsers = content.governmentUsers.filter((item) => item.username !== username);
  await writeAudit(content, actor.username, "user deleted", username, "success");
  await writeContentFile(content);
}

export async function resetGovernmentPassword(actor, username) {
  const content = await readContentFile();
  const temporaryPassword = generateTemporaryPassword();
  content.governmentUsers = content.governmentUsers.map((item) =>
    item.username === username
      ? {
          ...item,
          passwordHash: hashPassword(temporaryPassword),
          forcePasswordChange: true
        }
      : item
  );
  await writeAudit(content, actor.username, "password reset", username, "success");
  await writeContentFile(content);
  return temporaryPassword;
}

export function parseUserForm(formData) {
  return {
    username: String(formData.get("username") || "").trim(),
    displayName: String(formData.get("displayName") || "").trim(),
    role: String(formData.get("role") || "Read-Only Observer").trim(),
    active: formData.get("active") === "on",
    forcePasswordChange: formData.get("forcePasswordChange") === "on",
    temporaryPassword: String(formData.get("temporaryPassword") || "").trim(),
    notes: String(formData.get("notes") || "").trim()
  };
}

export function generateTemporaryPassword() {
  return `WPU-TEMP-${randomBytes(6).toString("hex").toUpperCase()}`;
}
