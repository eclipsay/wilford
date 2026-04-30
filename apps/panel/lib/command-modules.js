import { createHmac } from "node:crypto";

export function getSiteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.WEBSITE_URL ||
    "https://wilfordindustries.org"
  ).replace(/\/+$/, "");
}

function governmentBridgeSecret() {
  return (
    process.env.GOVERNMENT_AUTH_SECRET ||
    process.env.PANEL_SESSION_SECRET ||
    process.env.ADMIN_API_KEY ||
    "WPU-DEVELOPMENT-GOVERNMENT-AUTH-SECRET"
  );
}

export const commandModules = [
  {
    group: "Administration",
    title: "Citizen Applications",
    code: "CTS",
    order: 2,
    description:
      "Review citizenship intake, approvals, archived files, and credential delivery status.",
    path: "/government-access/citizenship",
    metric: "publicApplications"
  },
  {
    group: "Administration",
    title: "Citizen Requests",
    code: "REQ",
    order: 3,
    description:
      "Process petitions, support requests, work permits, and district transfer workflows.",
    path: "/government-access/citizen-requests",
    metric: "citizenRequests"
  },
  {
    group: "Administration",
    title: "Government Users",
    code: "USR",
    order: 1,
    description:
      "Manage restricted government accounts, roles, temporary passwords, and district assignment.",
    path: "/government-users",
    external: false,
    metric: "governmentUsers"
  },
  {
    group: "Publishing",
    title: "Articles",
    code: "ART",
    order: 1,
    description:
      "Create, edit, publish, and withdraw official WPU News articles from the panel.",
    path: "/articles",
    external: false,
    metric: "articles"
  },
  {
    group: "Publishing",
    title: "Bulletins",
    code: "BLT",
    order: 2,
    description:
      "Maintain bulletins, priority notices, expiry windows, and linked article dispatches from the panel.",
    path: "/bulletins",
    external: false,
    metric: "bulletins"
  },
  {
    group: "Publishing",
    title: "Broadcast Approvals",
    code: "BCS",
    order: 3,
    description:
      "Approve high-risk Discord broadcasts, status transitions, and delivery outcomes.",
    path: "/government-access/broadcast-approvals",
    metric: "broadcasts"
  },
  {
    group: "Security",
    title: "MSS Console",
    code: "MSS",
    order: 2,
    description:
      "Operate registry investigations, threat entries, enforcement notes, and restricted notices.",
    path: "/government-access/mss-console",
    metric: "enemyOfStateEntries"
  },
  {
    group: "Security",
    title: "Citizen Alerts",
    code: "ALT",
    order: 1,
    description:
      "Issue fines, grants, freezes, warnings, and appeal-enabled enforcement alerts.",
    path: "/government-access/citizen-alerts",
    metric: "citizenAlerts"
  },
  {
    group: "Security",
    title: "Union Security Registry",
    code: "IDR",
    order: 3,
    description:
      "Manage citizen IDs, district affiliation, passport records, and wallet links.",
    path: "/government-access/union-security-registry",
    metric: "citizenRecords"
  },
  {
    group: "Judiciary",
    title: "Supreme Court",
    code: "CRT",
    order: 1,
    description:
      "Oversee court cases, access keys, statements, petitions, and ruling publication.",
    path: "/government-access/supreme-court",
    metric: "supremeCourtCases"
  },
  {
    group: "Economy",
    title: "Panem Credit",
    code: "ECO",
    order: 1,
    description:
      "Operate wallets, taxes, market items, district production, and treasury controls.",
    path: "/government-access/panem-credit",
    metric: "wallets"
  },
  {
    group: "Economy",
    title: "Stock Market",
    code: "STK",
    order: 2,
    description:
      "Adjust listed companies, dividends, trading events, and market suspension controls.",
    path: "/government-access/stock-market",
    metric: "stockCompanies"
  },
  {
    group: "Districts",
    title: "District Governor",
    code: "DST",
    order: 1,
    description:
      "Review district populations, requests, funding, and local alert issuance.",
    path: "/government-access/district-governor",
    metric: "districtProfiles"
  },
  {
    group: "Audit",
    title: "Government Audit Log",
    code: "LOG",
    order: 1,
    description:
      "Inspect login activity, access denials, and restricted system actions.",
    path: "/government-access/audit",
    metric: "governmentAuditLog"
  }
];

export function buildModuleHref(path) {
  return `${getSiteBaseUrl()}${path}`;
}

function sign(value) {
  return createHmac("sha256", governmentBridgeSecret()).update(value).digest("hex");
}

export function createGovernmentBridgeHref(path, session = {}) {
  const next = String(path || "/government-access").startsWith("/government-access")
    ? String(path || "/government-access")
    : "/government-access";
  const role = session?.role === "owner" ? "Supreme Chairman" : "Executive Director";
  const payload = Buffer.from(
    JSON.stringify({
      username: `panel-${session?.username || "superadmin"}`,
      displayName: `Panel ${session?.username || "Superadmin"}`,
      role,
      assignedDistrict: "",
      expiresAt: Date.now() + 1000 * 60 * 30
    })
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${getSiteBaseUrl()}/government-access/panel-bridge?token=${encodeURIComponent(
    token
  )}&next=${encodeURIComponent(next)}`;
}
