export function getSiteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.WEBSITE_URL ||
    "https://wilfordindustries.org"
  ).replace(/\/+$/, "");
}

export const commandModules = [
  {
    group: "Government",
    title: "Citizen Applications",
    code: "CTS",
    description:
      "Review citizenship intake, approvals, archived files, and credential delivery status.",
    path: "/government-access/citizenship",
    metric: "publicApplications"
  },
  {
    group: "Government",
    title: "Citizen Requests",
    code: "REQ",
    description:
      "Process petitions, support requests, work permits, and district transfer workflows.",
    path: "/government-access/citizen-requests",
    metric: "citizenRequests"
  },
  {
    group: "Government",
    title: "Government Users",
    code: "USR",
    description:
      "Manage restricted government accounts, roles, temporary passwords, and district assignment.",
    path: "/government-access/users",
    metric: "governmentUsers"
  },
  {
    group: "Media",
    title: "Articles",
    code: "ART",
    description:
      "Create, edit, publish, and withdraw official WPU News articles.",
    path: "/government-access/articles",
    metric: "articles"
  },
  {
    group: "Media",
    title: "Bulletins",
    code: "BLT",
    description:
      "Maintain bulletins, priority notices, expiry windows, and linked article dispatches.",
    path: "/government-access/bulletins",
    metric: "bulletins"
  },
  {
    group: "Media",
    title: "Broadcast Approvals",
    code: "BCS",
    description:
      "Approve high-risk Discord broadcasts, status transitions, and delivery outcomes.",
    path: "/government-access/broadcast-approvals",
    metric: "broadcasts"
  },
  {
    group: "Security",
    title: "MSS Console",
    code: "MSS",
    description:
      "Operate registry investigations, threat entries, enforcement notes, and restricted notices.",
    path: "/government-access/mss-console",
    metric: "enemyOfStateEntries"
  },
  {
    group: "Security",
    title: "Citizen Alerts",
    code: "ALT",
    description:
      "Issue fines, grants, freezes, warnings, and appeal-enabled enforcement alerts.",
    path: "/government-access/citizen-alerts",
    metric: "citizenAlerts"
  },
  {
    group: "Security",
    title: "Union Security Registry",
    code: "IDR",
    description:
      "Manage citizen IDs, district affiliation, passport records, and wallet links.",
    path: "/government-access/union-security-registry",
    metric: "citizenRecords"
  },
  {
    group: "Judicial",
    title: "Supreme Court",
    code: "CRT",
    description:
      "Oversee court cases, access keys, statements, petitions, and ruling publication.",
    path: "/government-access/supreme-court",
    metric: "supremeCourtCases"
  },
  {
    group: "Economy",
    title: "Panem Credit",
    code: "ECO",
    description:
      "Operate wallets, taxes, market items, district production, and treasury controls.",
    path: "/government-access/panem-credit",
    metric: "wallets"
  },
  {
    group: "Economy",
    title: "Stock Market",
    code: "STK",
    description:
      "Adjust listed companies, dividends, trading events, and market suspension controls.",
    path: "/government-access/stock-market",
    metric: "stockCompanies"
  },
  {
    group: "Districts",
    title: "District Governor",
    code: "DST",
    description:
      "Review district populations, requests, funding, and local alert issuance.",
    path: "/government-access/district-governor",
    metric: "districtProfiles"
  },
  {
    group: "Audit",
    title: "Government Audit Log",
    code: "LOG",
    description:
      "Inspect login activity, access denials, and restricted system actions.",
    path: "/government-access/audit",
    metric: "governmentAuditLog"
  }
];

export function buildModuleHref(path) {
  return `${getSiteBaseUrl()}${path}`;
}
