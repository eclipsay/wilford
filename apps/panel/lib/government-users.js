import { pbkdf2Sync, randomBytes } from "node:crypto";
import { fetchAdmin } from "./api";

export const accessRoles = [
  "Supreme Chairman",
  "Executive Director",
  "First Minister",
  "Executive Command",
  "Ministry of Credit & Records",
  "Minister of Credit & Records",
  "MSS Command",
  "Minister of State Security",
  "MSS Agent",
  "Minister",
  "Security Command",
  "Judicial Officer",
  "District Governor",
  "Government Official",
  "Citizen Clerk",
  "Citizen"
];

function cleanText(value, maxLength = 1000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeUser(user, index = 0) {
  const role = accessRoles.includes(user?.role) ? user.role : "Citizen";

  return {
    id: String(user?.id || `user-${Date.now().toString(36)}-${index}`),
    username: cleanText(user?.username || "", 80).toLowerCase(),
    displayName: cleanText(user?.displayName || user?.username || "", 120),
    role,
    active: user?.active !== false,
    forcePasswordChange: Boolean(user?.forcePasswordChange),
    passwordHash: String(user?.passwordHash || ""),
    createdAt: user?.createdAt || new Date().toISOString(),
    lastLoginAt: user?.lastLoginAt || "",
    assignedDistrict: cleanText(user?.assignedDistrict || "", 80),
    notes: cleanText(user?.notes || "", 1000)
  };
}

function createAuditEntry(actor, action, detail, status = "success") {
  return {
    id: `audit-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    at: new Date().toISOString(),
    actor: cleanText(actor, 120) || "panel-admin",
    action: cleanText(action, 120),
    detail: cleanText(detail, 1000),
    status: cleanText(status, 40)
  };
}

export function hashGovernmentPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(String(password || ""), salt, 210000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$210000$${salt}$${hash}`;
}

export function generateTemporaryPassword() {
  return `WPU-TEMP-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function getGovernmentAdminSnapshot() {
  const store = await fetchAdmin("/api/admin/government-access-store");

  return {
    governmentUsers: Array.isArray(store.governmentUsers)
      ? store.governmentUsers.map(normalizeUser)
      : [],
    governmentAuditLog: Array.isArray(store.governmentAuditLog)
      ? store.governmentAuditLog
      : [],
    districtProfiles: Array.isArray(store.districtProfiles) ? store.districtProfiles : []
  };
}

async function saveGovernmentUsers(snapshot, governmentUsers, governmentAuditLog) {
  await fetchAdmin("/api/admin/government-access-store", {
    method: "POST",
    body: JSON.stringify({
      governmentUsers,
      governmentAuditLog,
      districtProfiles: snapshot.districtProfiles
    })
  });
}

export async function createGovernmentUserFromPanel(snapshot, actor, fields) {
  const username = cleanText(fields.username, 80).toLowerCase();
  const displayName = cleanText(fields.displayName, 120);
  const temporaryPassword = cleanText(fields.temporaryPassword, 160) || generateTemporaryPassword();

  if (!username || !displayName) {
    throw new Error("Username and display name are required.");
  }

  if (snapshot.governmentUsers.some((user) => user.username === username)) {
    throw new Error("That government username already exists.");
  }

  const nextUsers = [
    ...snapshot.governmentUsers,
    normalizeUser({
      id: `user-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
      username,
      displayName,
      role: fields.role,
      active: true,
      forcePasswordChange: fields.forcePasswordChange !== false,
      passwordHash: hashGovernmentPassword(temporaryPassword),
      createdAt: new Date().toISOString(),
      assignedDistrict: fields.assignedDistrict,
      notes: fields.notes
    })
  ];

  const nextAuditLog = [
    createAuditEntry(actor, "panel user created", username),
    ...snapshot.governmentAuditLog
  ].slice(0, 300);

  await saveGovernmentUsers(snapshot, nextUsers, nextAuditLog);

  return temporaryPassword;
}

export async function updateGovernmentUserFromPanel(snapshot, actor, username, fields) {
  const nextUsers = snapshot.governmentUsers.map((user) =>
    user.username === username
      ? normalizeUser({
          ...user,
          displayName: fields.displayName,
          role: fields.role,
          active: fields.active,
          forcePasswordChange: fields.forcePasswordChange,
          assignedDistrict: fields.assignedDistrict,
          notes: fields.notes
        })
      : user
  );

  const nextAuditLog = [
    createAuditEntry(actor, "panel user edited", username),
    ...snapshot.governmentAuditLog
  ].slice(0, 300);

  await saveGovernmentUsers(snapshot, nextUsers, nextAuditLog);
}

export async function resetGovernmentUserPasswordFromPanel(snapshot, actor, username) {
  const temporaryPassword = generateTemporaryPassword();
  const nextUsers = snapshot.governmentUsers.map((user) =>
    user.username === username
      ? {
          ...user,
          passwordHash: hashGovernmentPassword(temporaryPassword),
          forcePasswordChange: true
        }
      : user
  );

  const nextAuditLog = [
    createAuditEntry(actor, "panel password reset", username),
    ...snapshot.governmentAuditLog
  ].slice(0, 300);

  await saveGovernmentUsers(snapshot, nextUsers, nextAuditLog);
  return temporaryPassword;
}

export async function disableGovernmentUserFromPanel(snapshot, actor, username) {
  const nextUsers = snapshot.governmentUsers.map((user) =>
    user.username === username ? { ...user, active: false } : user
  );

  const nextAuditLog = [
    createAuditEntry(actor, "panel user disabled", username),
    ...snapshot.governmentAuditLog
  ].slice(0, 300);

  await saveGovernmentUsers(snapshot, nextUsers, nextAuditLog);
}

export async function deleteGovernmentUserFromPanel(snapshot, actor, username) {
  const nextUsers = snapshot.governmentUsers.filter((user) => user.username !== username);
  const nextAuditLog = [
    createAuditEntry(actor, "panel user deleted", username),
    ...snapshot.governmentAuditLog
  ].slice(0, 300);

  await saveGovernmentUsers(snapshot, nextUsers, nextAuditLog);
}
