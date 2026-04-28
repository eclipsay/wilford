const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

export const broadcastTypes = [
  { value: "news", label: "News Broadcast" },
  { value: "emergency", label: "Emergency Communication" },
  { value: "mss_alert", label: "MSS Security Alert" },
  { value: "treason_notice", label: "Treason / Enemy of the State Notice" }
];

export const broadcastDistributions = [
  { value: "none", label: "Do not send to Discord" },
  { value: "announcement", label: "Send to announcement channel only" },
  { value: "dm_all", label: "Send as direct message to all server members" },
  { value: "announcement_and_dm_all", label: "Send to Discord server and DM all members" },
  { value: "specific_user", label: "Send to specific Discord ID" }
];

export const mssClassifications = [
  "Person of Interest",
  "Security Concern",
  "Hostile Actor",
  "Enemy of the State"
];

export const mssThreatLevels = ["Low", "Moderate", "High", "Critical"];

export const mssDistributions = [
  { value: "mss_only", label: "MSS only" },
  { value: "government_officials", label: "Government officials" },
  { value: "announcement", label: "Public announcement channel" },
  { value: "dm_all", label: "DM all server members" },
  { value: "specific_user", label: "DM specific Discord ID" }
];

export function requiresChairmanApproval(fields = {}) {
  return (
    ["dm_all", "announcement_and_dm_all"].includes(fields.distribution) ||
    fields.type === "treason_notice"
  );
}

const headingByType = {
  news: "Official WPU News Broadcast",
  emergency: "Emergency Directive",
  mss_alert: "Ministry of State Security Advisory",
  treason_notice: "MSS Security Directive"
};

function adminApiKey() {
  return process.env.DISCORD_BROADCAST_API_KEY || process.env.ADMIN_API_KEY;
}

function cleanText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

async function requestBroadcasts(path, options = {}) {
  const key = adminApiKey();
  const requestUrl = `${baseUrl}${path}`;

  if (!key) {
    throw new Error("Missing DISCORD_BROADCAST_API_KEY or ADMIN_API_KEY.");
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(options.headers || {})
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Discord broadcast API returned ${response.status}.`);
  }

  return data;
}

export function parseBroadcastOptions(formData) {
  const distribution = cleanText(formData.get("discordDistribution") || "none", 80);
  const requestedType = cleanText(formData.get("broadcastType") || "news", 80);
  const type = broadcastTypes.some((option) => option.value === requestedType)
    ? requestedType
    : "news";

  return {
    enabled: distribution !== "none",
    distribution,
    type,
    targetDiscordId: cleanText(formData.get("targetDiscordId") || "", 80),
    confirmed: formData.get("confirmDiscordBroadcast") === "on"
  };
}

export function formatBroadcastMessage(type, fields = {}) {
  const heading = headingByType[type] || headingByType.news;
  const title = cleanText(fields.title || fields.headline || fields.subjectName || heading, 180);
  const body = cleanText(fields.body || fields.summary || fields.reason || "", 3500);
  const link = cleanText(fields.link || "", 240);

  return [heading, "", `Subject: ${title}`, body, link ? `Reference: ${link}` : ""]
    .filter(Boolean)
    .join("\n");
}

export function formatMssSecurityAlert(fields = {}) {
  const classification = cleanText(fields.classification || "Person of Interest", 80);
  const threatLevel = cleanText(fields.threatLevel || "Low", 80);
  const subjectName = cleanText(fields.subjectName || "Unnamed subject", 180);
  const reason = cleanText(fields.reason || "", 1400);
  const evidenceNotes = cleanText(fields.evidenceNotes || "", 1400);
  const verdictLine =
    classification === "Enemy of the State"
      ? `${subjectName} has been classified as ${classification}.`
      : `${subjectName} has been designated as ${classification} for authorised review.`;

  return [
    "Ministry of State Security Directive:",
    verdictLine,
    `Threat Level: ${threatLevel}.`,
    reason ? `Summary: ${reason}` : "",
    evidenceNotes ? `Evidence Notes: ${evidenceNotes}` : "",
    "All authorised members are instructed to report relevant activity through official channels."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createDiscordBroadcast(fields) {
  if (!fields?.distribution || fields.distribution === "none") {
    return null;
  }

  const { broadcast } = await requestBroadcasts("/api/admin/discord-broadcasts", {
    method: "POST",
    body: JSON.stringify(fields)
  });

  return broadcast;
}

export async function getDiscordBroadcasts() {
  const { broadcasts } = await requestBroadcasts("/api/admin/discord-broadcasts");
  return Array.isArray(broadcasts) ? broadcasts : [];
}

export async function updateDiscordBroadcast(id, fields) {
  const { broadcast } = await requestBroadcasts(
    `/api/admin/discord-broadcasts/${encodeURIComponent(id)}`,
    {
      method: "POST",
      body: JSON.stringify(fields)
    }
  );

  return broadcast;
}
