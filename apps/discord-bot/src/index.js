import dotenv from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits,
  PermissionsBitField,
  Partials,
  SlashCommandBuilder
} from "discord.js";
import {
  applicationQuestions,
  brand,
  formatShortSha,
  publicBotCommands,
  staffApplicationCommands
} from "@wilford/shared";

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const currentDir = dirname(fileURLToPath(import.meta.url));
const stateFile = resolve(currentDir, "../data/state.json");
const apiUrl = (process.env.API_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
const commandPrefix = "-";
const botOwnerId = "140478632165507073";
const applicationsChannelId = String(
  process.env.DISCORD_APPLICATIONS_CHANNEL_ID || ""
).trim();
const applicationReviewRoleId = String(
  process.env.DISCORD_APPLICATION_REVIEW_ROLE_ID || ""
).trim();
const applicationRoleId = String(
  process.env.DISCORD_APPLICATION_ROLE_ID || ""
).trim();
const adminApiKey = String(process.env.ADMIN_API_KEY || "").trim();
const broadcastGuildId = String(process.env.DISCORD_GUILD_ID || "").trim();
const announcementChannelId = String(process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID || "").trim();
const mssChannelId = String(process.env.DISCORD_MSS_CHANNEL_ID || "").trim();
const lemmieDiscordUserId = String(process.env.DISCORD_LEMMIE_USER_ID || botOwnerId).trim();
const applicationGuildId = String(
  process.env.DISCORD_APPLICATION_GUILD_ID || process.env.DISCORD_GUILD_ID || ""
).trim();
const applicationCommandUrl =
  process.env.DISCORD_COMMANDS_URL || "https://wilfordindustries.org/commands";
const websiteUrl = (process.env.WEBSITE_URL || "https://wilfordindustries.org").replace(/\/+$/, "");
const pollIntervalMs = Math.max(
  15000,
  Number(process.env.DISCORD_COMMITS_POLL_INTERVAL_MS || 60000)
);
const timeoutUnitMap = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};
const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000;

if (!token) {
  console.log("Discord bot not started: DISCORD_BOT_TOKEN or DISCORD_TOKEN is missing.");
  process.exit(0);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

function createDefaultState() {
  return {
    lastCommitSha: "",
    applications: [],
    applicationSessions: []
  };
}

async function readState() {
  try {
    const raw = await readFile(stateFile, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...createDefaultState(),
      ...parsed,
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
      applicationSessions: Array.isArray(parsed.applicationSessions)
        ? parsed.applicationSessions
        : []
    };
  } catch {
    return createDefaultState();
  }
}

async function writeState(state) {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function updateState(mutator) {
  const state = await readState();
  const nextState = (await mutator(state)) || state;
  await writeState(nextState);
  return nextState;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBotOwner(userId) {
  return String(userId || "") === botOwnerId;
}

function hasPermission(memberPermissions, permission) {
  return memberPermissions?.has(permission) || false;
}

function hasCommandAccess(message, permission) {
  return isBotOwner(message.author.id) || hasPermission(message.member?.permissions, permission);
}

function hasSlashCommandAccess(interaction, permission) {
  return isBotOwner(interaction.user.id) || hasPermission(interaction.memberPermissions, permission);
}

function parseTimeoutDuration(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)([smhd])$/);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const durationMs = amount * timeoutUnitMap[unit];

  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > maxTimeoutMs) {
    return null;
  }

  return durationMs;
}

function getReason(args, startIndex, fallback) {
  const reason = args.slice(startIndex).join(" ").trim();
  return reason || fallback;
}

function buildHelpText() {
  const primaryLines = publicBotCommands.map(
    (command) => `${command.name} - ${command.description}`
  );
  const staffLines = staffApplicationCommands.map(
    (command) => `${command.name} - ${command.description}`
  );

  return [
    "Wilford Discord Commands",
    "",
    ...primaryLines,
    "",
    "Application Review Thread Commands",
    ...staffLines,
    "-status <status> [note] - Set pending, under_review, approved, rejected, appealed, or archived.",
    "-underreview [note] - Mark the application as Under Review.",
    "-requestinfo [message] - Request more information from the applicant.",
    "",
    `Full command archive: ${applicationCommandUrl}`
  ].join("\n");
}

function buildApplicationSummary(application) {
  return application.answers
    .map((answer, index) => `**Q${index + 1}.** ${applicationQuestions[index]}\n${answer}`)
    .join("\n\n");
}

const applicationStatusLabels = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  appealed: "Appealed",
  archived: "Archived"
};

const applicantReplyStatuses = new Set(["pending", "under_review", "appealed"]);

function normalizeApplicationStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    accept: "approved",
    accepted: "approved",
    approve: "approved",
    deny: "rejected",
    denied: "rejected",
    reject: "rejected",
    info: "under_review",
    information_requested: "under_review",
    request_info: "under_review",
    underreview: "under_review",
    review: "under_review"
  };
  const status = aliases[normalized] || normalized;
  return Object.hasOwn(applicationStatusLabels, status) ? status : "";
}

function formatApplicationStatusLabel(status) {
  return applicationStatusLabels[normalizeApplicationStatus(status)] || String(status || "Unknown");
}

async function findReviewApplicationByThread(threadId) {
  const state = await readState();
  return state.applications.find(
    (application) => application.reviewThreadId === threadId
  ) || null;
}

async function findLatestPendingApplicationByApplicant(applicantId) {
  const state = await readState();
  return (
    state.applications.find(
      (application) =>
        application.applicantId === applicantId &&
        application.status === "pending" &&
        application.reviewThreadId
    ) || null
  );
}

async function findLatestApplicationByApplicant(applicantId) {
  const state = await readState();
  return (
    state.applications.find(
      (application) =>
        application.applicantId === applicantId &&
        application.reviewThreadId
    ) || null
  );
}

async function setApplicationStatus(applicationId, nextFields) {
  let updatedApplication = null;

  await updateState((state) => {
    state.applications = state.applications.map((application) => {
      if (application.id !== applicationId) {
        return application;
      }

      updatedApplication = {
        ...application,
        ...nextFields,
        updatedAt: new Date().toISOString()
      };
      return updatedApplication;
    });

    return state;
  });

  return updatedApplication;
}

async function updateRemoteApplication(applicationId, fields) {
  if (!adminApiKey) {
    return null;
  }

  const response = await fetch(`${apiUrl}/api/admin/applications/${encodeURIComponent(applicationId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify(fields),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return response.json().catch(() => null);
}

async function setApplicationReviewStatus(application, status, options = {}) {
  const normalizedStatus = normalizeApplicationStatus(status);

  if (!normalizedStatus) {
    return null;
  }

  const updated = await setApplicationStatus(application.id, {
    status: normalizedStatus,
    decisionBy: options.actorId || "",
    decisionNote: options.decisionNote || "",
    needsAttention: Boolean(options.needsAttention),
    updatedAt: new Date().toISOString()
  });

  await updateRemoteApplication(application.id, {
    status: normalizedStatus,
    decisionNote: options.decisionNote || "",
    publicResponse: options.publicResponse || "",
    requestInfo: Boolean(options.requestInfo),
    needsAttention: Boolean(options.needsAttention),
    archived: normalizedStatus === "archived",
    suppressDiscordEvents: Boolean(options.suppressDiscordEvents),
    actor: options.actorId ? `discord:${options.actorId}` : "discord"
  }).catch(() => null);

  return updated;
}

async function getActiveApplicationSession(userId) {
  const state = await readState();
  return state.applicationSessions.find((session) => session.userId === userId) || null;
}

async function startApplicationSession(user, originGuildId) {
  const existingSession = await getActiveApplicationSession(user.id);

  if (existingSession) {
    return existingSession;
  }

  const session = {
    id: createId("application"),
    userId: user.id,
    username: user.tag,
    originGuildId: originGuildId || applicationGuildId || "",
    questionIndex: 0,
    answers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await updateState((state) => {
    state.applicationSessions.unshift(session);
    return state;
  });

  return session;
}

async function submitApplication(session) {
  if (!applicationsChannelId) {
    throw new Error("DISCORD_APPLICATIONS_CHANNEL_ID is not configured.");
  }

  const channel = await client.channels.fetch(applicationsChannelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.type === ChannelType.DM) {
    throw new Error("The applications review channel is missing or not text-capable.");
  }

  const applicantMention = `<@${session.userId}>`;
  const pingTarget = applicationReviewRoleId
    ? `<@&${applicationReviewRoleId}>`
    : `<@${botOwnerId}>`;
  const application = {
    id: session.id,
    applicantId: session.userId,
    applicantTag: session.username,
    guildId: session.originGuildId || applicationGuildId || "",
    status: "pending",
    answers: session.answers,
    reviewThreadId: "",
    reviewMessageId: "",
    createdAt: session.createdAt,
    updatedAt: new Date().toISOString()
  };

  const intro = await channel.send({
    content: `${pingTarget} New Wilford application from ${applicantMention}`,
    embeds: [
      new EmbedBuilder()
        .setColor(0xd7a85f)
        .setTitle(`Application Review - ${session.username}`)
        .setDescription(buildApplicationSummary(application))
        .addFields(
          {
            name: "Applicant",
            value: `${applicantMention} (${session.username})`,
            inline: false
          },
          {
            name: "Review Commands",
            value: "`-r`, `-accept`, `-deny`",
            inline: false
          }
        )
        .setFooter({ text: `Application ID: ${application.id}` })
        .setTimestamp(new Date())
    ]
  });

  const thread = await intro.startThread({
    name: `application-${session.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90),
    autoArchiveDuration: 1440,
    reason: `Wilford application review for ${session.username}`
  });

  await addReviewMembersToThread(thread, session.originGuildId);

  application.reviewThreadId = thread.id;
  application.reviewMessageId = intro.id;

  await updateState((state) => {
    state.applications.unshift(application);
    state.applicationSessions = state.applicationSessions.filter(
      (activeSession) => activeSession.userId !== session.userId
    );
    return state;
  });

  await thread.send(
    `Application ready for review.\nUse \`-r <message>\`, \`-accept [message]\`, or \`-deny [message]\`.`
  );

  return application;
}

async function addReviewMembersToThread(thread, guildId) {
  if (!applicationReviewRoleId || !guildId) {
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return;
  }

  const reviewRole = await guild.roles.fetch(applicationReviewRoleId).catch(() => null);

  if (!reviewRole) {
    return;
  }

  const reviewMembers = await guild.members.fetch().catch(() => null);

  if (!reviewMembers) {
    return;
  }

  const addThreadPromises = reviewMembers
    .filter((member) => !member.user.bot && member.roles.cache.has(reviewRole.id))
    .map((member) => thread.members.add(member.id).catch(() => null));

  await Promise.all(addThreadPromises);
}

async function continueApplicationSession(message, session) {
  const answer = String(message.content || "").trim();

  if (!answer) {
    return;
  }

  const nextAnswers = [...session.answers, answer];
  const nextQuestionIndex = session.questionIndex + 1;

  if (nextQuestionIndex >= applicationQuestions.length) {
    await submitApplication({
      ...session,
      answers: nextAnswers
    });

    await message.channel.send(
      "Your application has been submitted to the Ministry of Credit and Records for review. You will receive any follow-up questions or a decision here in DMs."
    );
    return;
  }

  await updateState((state) => {
    state.applicationSessions = state.applicationSessions.map((activeSession) =>
      activeSession.userId === session.userId
        ? {
            ...activeSession,
            answers: nextAnswers,
            questionIndex: nextQuestionIndex,
            updatedAt: new Date().toISOString()
          }
        : activeSession
    );
    return state;
  });

  await message.channel.send(
    `Question ${nextQuestionIndex + 1}/${applicationQuestions.length}: ${applicationQuestions[nextQuestionIndex]}`
  );
}

async function beginApplicationFlow(user, guildId) {
  const dmChannel = await user.createDM();
  const session = await startApplicationSession(user, guildId);

  if (session.answers.length || session.questionIndex > 0) {
    await dmChannel.send(
      `Your Wilford application is already open.\nQuestion ${session.questionIndex + 1}/${applicationQuestions.length}: ${applicationQuestions[session.questionIndex]}`
    );
    return;
  }

  await dmChannel.send(
    [
      "Wilford Industries Application Intake",
      "",
      "Reply to each question with one message at a time.",
      `Question 1/${applicationQuestions.length}: ${applicationQuestions[0]}`
    ].join("\n")
  );
}

async function forwardApplicantMessageToReviewThread(message, application) {
  const thread = await client.channels
    .fetch(application.reviewThreadId)
    .catch(() => null);

  if (!thread || !thread.isTextBased()) {
    throw new Error("The application review thread could not be found.");
  }

  const attachmentLines = message.attachments.map(
    (attachment) => attachment.url
  );
  const body = [
    `Applicant follow-up from <@${application.applicantId}> (${message.author.tag})`,
    "",
    message.content || "[No text content]",
    ...(attachmentLines.length
      ? ["", "Attachments:", ...attachmentLines]
      : [])
  ].join("\n");

  await thread.send(body);
}

async function sendApplicantDirectMessage(applicantId, content) {
  if (!String(applicantId || "").trim()) {
    throw new Error("This application is not linked to a Discord user ID.");
  }

  const user = await client.users.fetch(applicantId).catch(() => null);

  if (!user) {
    throw new Error("Applicant account could not be fetched.");
  }

  const dm = await user.createDM();
  await dm.send(content);
}

async function grantApplicantRole(application) {
  if (!applicationRoleId || !application.guildId || !application.applicantId) {
    return false;
  }

  const guild = await client.guilds.fetch(application.guildId).catch(() => null);

  if (!guild) {
    return false;
  }

  const member = await guild.members.fetch(application.applicantId).catch(() => null);

  if (!member) {
    return false;
  }

  await member.roles.add(applicationRoleId, "Accepted Wilford application");
  return true;
}

async function handleReviewThreadCommand(message, commandName, args) {
  const application = await findReviewApplicationByThread(message.channel.id);

  if (!application) {
    return false;
  }

  const canReview =
    isBotOwner(message.author.id) ||
    hasPermission(message.member?.permissions, PermissionsBitField.Flags.ManageMessages) ||
    hasPermission(message.member?.permissions, PermissionsBitField.Flags.ModerateMembers);

  if (!canReview) {
    await message.reply("You do not have review access for application threads.");
    return true;
  }

  const hasLinkedDiscordUser = Boolean(String(application.applicantId || "").trim());
  const reviewThread = message.channel;

  async function announceStatusChange(status, note = "") {
    const label = formatApplicationStatusLabel(status);
    await reviewThread.send({
      embeds: [
        new EmbedBuilder()
          .setColor(status === "rejected" ? 0x8a3f38 : status === "approved" ? 0x4f8a5b : 0xd7a85f)
          .setTitle("Citizenship Application Status Updated")
          .setDescription(
            [
              `Ministry of Credit and Records: Application status changed to ${label}.`,
              note ? `\n${note}` : ""
            ].join("")
          )
          .addFields(
            {
              name: "Updated By",
              value: `<@${message.author.id}>`,
              inline: true
            },
            {
              name: "Applicant",
              value: hasLinkedDiscordUser
                ? `<@${application.applicantId}>`
                : application.applicantTag || "Website applicant",
              inline: true
            }
          )
          .setTimestamp(new Date())
      ]
    });
  }

  async function closeReviewThread(status, note) {
    if (!reviewThread?.isThread?.()) {
      return;
    }

    await reviewThread.send({
      embeds: [
        new EmbedBuilder()
          .setColor(status === "accepted" ? 0x4f8a5b : 0x8a3f38)
          .setTitle(
            status === "accepted" ? "Application Accepted" : "Application Denied"
          )
          .setDescription(
            note?.trim()
              ? note
              : status === "accepted"
                ? "The application has been approved and this review thread is now closed."
                : "The application has been declined and this review thread is now closed."
          )
          .addFields(
            {
              name: "Reviewed By",
              value: `<@${message.author.id}>`,
              inline: true
            },
            {
              name: "Applicant",
              value: hasLinkedDiscordUser
                ? `<@${application.applicantId}>`
                : application.applicantTag || "Website applicant",
              inline: true
            }
          )
          .setTimestamp(new Date())
      ]
    });

    await reviewThread.setLocked(true, `Application ${status}`);
    await reviewThread.setArchived(true, `Application ${status}`);
  }

  if (commandName === "r") {
    const replyText = args.join(" ").trim();

    if (!replyText) {
      await message.reply("Use `-r <message>` inside the application review thread.");
      return true;
    }

    if (hasLinkedDiscordUser) {
      await sendApplicantDirectMessage(
        application.applicantId,
        `Ministry of Credit and Records: ${replyText}`
      );
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(hasLinkedDiscordUser ? 0xd7a85f : 0xb87d38)
          .setTitle(hasLinkedDiscordUser ? "Applicant Reply Sent" : "Staff Reply Logged")
          .setDescription(replyText)
          .addFields(
            {
              name: "Sent By",
              value: `<@${message.author.id}>`,
              inline: true
            },
            {
              name: "Applicant",
              value: hasLinkedDiscordUser
                ? `<@${application.applicantId}>`
                : application.applicantTag || "Website applicant",
              inline: true
            },
            {
              name: "Delivery",
              value: hasLinkedDiscordUser
                ? "Delivered by Discord DM"
                : "No linked Discord user ID, so this was logged only in the review thread.",
              inline: false
            }
          )
          .setTimestamp(new Date())
      ]
    });
    return true;
  }

  if (commandName === "status") {
    const requestedStatus = normalizeApplicationStatus(args.shift());
    const note = args.join(" ").trim();

    if (!requestedStatus) {
      await message.reply("Use `-status pending|under_review|approved|rejected|appealed|archived [note]`.");
      return true;
    }

    await setApplicationReviewStatus(application, requestedStatus, {
      actorId: message.author.id,
      decisionNote: note,
      publicResponse: note,
      needsAttention: requestedStatus === "appealed"
    });
    await announceStatusChange(requestedStatus, note);
    await message.reply(`Application status set to ${formatApplicationStatusLabel(requestedStatus)}.`);
    return true;
  }

  if (["underreview", "under-review", "review"].includes(commandName)) {
    const note = args.join(" ").trim();
    await setApplicationReviewStatus(application, "under_review", {
      actorId: message.author.id,
      decisionNote: note,
      publicResponse: note || "Your application is now under review."
    });
    await announceStatusChange("under_review", note);
    await message.reply("Application status set to Under Review.");
    return true;
  }

  if (["requestinfo", "request-info", "info"].includes(commandName)) {
    const note = args.join(" ").trim();
    const publicResponse = note || "Additional information is required.";
    await setApplicationReviewStatus(application, "under_review", {
      actorId: message.author.id,
      decisionNote: note,
      publicResponse,
      requestInfo: true,
      needsAttention: true
    });
    await announceStatusChange("under_review", publicResponse);
    await message.reply("Information request sent and application marked Under Review.");
    return true;
  }

  if (commandName === "accept") {
    const note = args.join(" ").trim();
    const updated = await setApplicationReviewStatus(application, "approved", {
      actorId: message.author.id,
      decisionNote: note,
      suppressDiscordEvents: true
    });
    const roleGranted = hasLinkedDiscordUser ? await grantApplicantRole(updated) : false;

    if (hasLinkedDiscordUser) {
      await sendApplicantDirectMessage(
        updated.applicantId,
        note
          ? `Ministry of Credit and Records: Your citizenship application has been approved.\n\n${note}`
          : "Ministry of Credit and Records: Your citizenship application has been approved."
      );
    }
    await message.reply(
      hasLinkedDiscordUser
        ? roleGranted
          ? "Application accepted, applicant notified, and role granted."
          : "Application accepted and applicant notified."
        : "Application accepted. No Discord user ID was linked, so no DM or automatic role was applied."
    );
    await closeReviewThread("accepted", note);

    return true;
  }

  if (commandName === "deny") {
    const note = args.join(" ").trim();
    const updated = await setApplicationReviewStatus(application, "rejected", {
      actorId: message.author.id,
      decisionNote: note,
      suppressDiscordEvents: true
    });

    if (hasLinkedDiscordUser) {
      await sendApplicantDirectMessage(
        updated.applicantId,
        note
          ? `Ministry of Credit and Records: Your citizenship application has been rejected.\n\n${note}`
          : "Ministry of Credit and Records: Your citizenship application has been rejected."
      );
    }
    await message.reply(
      hasLinkedDiscordUser
        ? "Application denied and applicant notified."
        : "Application denied. No Discord user ID was linked, so no DM was sent."
    );
    await closeReviewThread("denied", note);

    return true;
  }

  return false;
}

async function getSettings() {
  const response = await fetch(`${apiUrl}/api/settings`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Settings request failed: ${response.status}`);
  }

  return response.json();
}

async function getPendingWebsiteApplications() {
  if (!adminApiKey) {
    return [];
  }

  const response = await fetch(`${apiUrl}/api/admin/applications/pending`, {
    headers: {
      "x-admin-key": adminApiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Pending applications request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.applications) ? payload.applications : [];
}

async function markWebsiteApplicationThread(applicationId, payload) {
  if (!adminApiKey) {
    return;
  }

  await fetch(`${apiUrl}/api/admin/applications/${applicationId}/review-thread`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
}

async function getPendingApplicationDiscordEvents() {
  if (!adminApiKey) {
    return [];
  }

  const response = await fetch(`${apiUrl}/api/admin/applications/discord-events`, {
    headers: {
      "x-admin-key": adminApiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Application Discord events request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.applications) ? payload.applications : [];
}

async function markApplicationDiscordEvent(applicationId, eventId, fields) {
  if (!adminApiKey) {
    return;
  }

  await fetch(
    `${apiUrl}/api/admin/applications/${encodeURIComponent(applicationId)}/discord-events/${encodeURIComponent(eventId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminApiKey
      },
      body: JSON.stringify(fields),
      cache: "no-store"
    }
  );
}

async function deliverApplicationDiscordEvent(application, event) {
  const threadId = application.discordThreadId || application.reviewThreadId;
  const applicantId = String(application.discordUserId || "").trim();
  const message = event.message || "Ministry of Credit and Records: Application updated.";

  if (!threadId) {
    throw new Error("Application has no Discord review thread.");
  }

  const thread = await client.channels.fetch(threadId).catch(() => null);

  if (!thread || !thread.isTextBased()) {
    throw new Error("Application review thread could not be fetched.");
  }

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor(event.type === "appealed" ? 0x63b3ed : 0xd7a85f)
        .setTitle("Citizenship Application Update")
        .setDescription(message)
        .addFields(
          {
            name: "Application",
            value: application.id,
            inline: true
          },
          {
            name: "Event",
            value: String(event.type || "update").replace(/_/g, " "),
            inline: true
          }
        )
        .setTimestamp(new Date())
    ]
  });

  if (applicantId && ["public_reply", "request_info", "status_changed", "appealed"].includes(event.type)) {
    try {
      await sendApplicantDirectMessage(applicantId, message);
    } catch (error) {
      await thread.send(
        `Ministry of Credit and Records delivery note: applicant DM failed (${error instanceof Error ? error.message : "unknown error"}).`
      );
    }
  }
}

async function submitApplicationAppeal(applicationId, reason) {
  if (!adminApiKey) {
    return null;
  }

  const response = await fetch(`${apiUrl}/api/admin/applications/${encodeURIComponent(applicationId)}/appeal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify({
      appealReason: reason,
      actor: "applicant"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Appeal request failed: ${response.status}`);
  }

  return response.json();
}

async function getPendingDiscordBroadcasts() {
  if (!adminApiKey) {
    return [];
  }

  const response = await fetch(`${apiUrl}/api/admin/discord-broadcasts?status=pending`, {
    headers: {
      "x-admin-key": adminApiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Pending broadcasts request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.broadcasts) ? payload.broadcasts : [];
}

async function getBroadcastApprovalRequests() {
  if (!adminApiKey) {
    return [];
  }

  const requests = [];

  for (const status of ["pending_approval", "approval_notified"]) {
    const response = await fetch(`${apiUrl}/api/admin/discord-broadcasts?status=${status}`, {
      headers: {
        "x-admin-key": adminApiKey
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Broadcast approval request failed: ${response.status}`);
    }

    const payload = await response.json();
    requests.push(...(Array.isArray(payload?.broadcasts) ? payload.broadcasts : []));
  }

  return requests;
}

async function markDiscordBroadcast(broadcastId, payload) {
  if (!adminApiKey) {
    return;
  }

  await fetch(`${apiUrl}/api/admin/discord-broadcasts/${encodeURIComponent(broadcastId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function channelIdForBroadcast(broadcast) {
  if (broadcast.distribution === "mss_only" || broadcast.distribution === "government_officials") {
    return mssChannelId || announcementChannelId;
  }

  return announcementChannelId;
}

function cleanBroadcastLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseLegacyBroadcastBody(body = "") {
  const lines = String(body || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const subjectLine = lines.find((line) => line.toLowerCase().startsWith("subject:"));
  const referenceLine = lines.find((line) => line.toLowerCase().startsWith("reference:"));
  const heading = lines[0] || "";
  const bodyLines = lines.filter(
    (line, index) =>
      index !== 0 &&
      line !== subjectLine &&
      line !== referenceLine
  );

  return {
    heading,
    subject: subjectLine ? subjectLine.replace(/^subject:\s*/i, "").trim() : "",
    reference: referenceLine ? referenceLine.replace(/^reference:\s*/i, "").trim() : "",
    excerpt: bodyLines.join("\n").trim()
  };
}

function absoluteWebsiteUrl(value) {
  const clean = String(value || "").trim();

  if (!clean) {
    return "";
  }

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  if (clean.startsWith("/")) {
    return `${websiteUrl}${clean}`;
  }

  return `${websiteUrl}/${clean}`;
}

function officialIssuerName(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized.includes("chairman") || normalized === "chairman") {
    return "The Office of the Chairman";
  }

  if (
    normalized.includes("mss") ||
    normalized.includes("state security") ||
    normalized.includes("security command")
  ) {
    return "Ministry of State Security";
  }

  if (normalized.includes("supreme court") || normalized.includes("judicial")) {
    return "Supreme Court of Panem";
  }

  if (normalized.includes("government") || normalized.includes("wpu")) {
    return "Wilford Panem Union";
  }

  return cleanBroadcastLine(value) || "Wilford Panem Union";
}

function colorForIssuer(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized.includes("chairman")) {
    return 0xd7a85f;
  }

  if (normalized.includes("mss") || normalized.includes("state security")) {
    return 0x681313;
  }

  if (normalized.includes("supreme court") || normalized.includes("judicial")) {
    return 0xc0c0c0;
  }

  return 0x5b3fd6;
}

function classificationForBroadcast(broadcast, issuerName) {
  if (broadcast.classification) {
    return cleanBroadcastLine(broadcast.classification);
  }

  if (broadcast.type === "emergency") {
    return "Emergency Communication";
  }

  if (broadcast.type === "mss_alert" || broadcast.type === "treason_notice") {
    return "Security Classification";
  }

  if (issuerName === "The Office of the Chairman") {
    return "Chairman Bulletin";
  }

  if (issuerName === "Supreme Court of Panem") {
    return "Judicial Notice";
  }

  return "Official News";
}

function buildBroadcastEmbed(broadcast) {
  const parsed = parseLegacyBroadcastBody(broadcast.body);
  const headline = cleanBroadcastLine(
    broadcast.headline ||
      parsed.subject ||
      broadcast.title ||
      "Official WPU News Bulletin"
  );
  const issuerName = officialIssuerName(
    broadcast.issuer ||
      broadcast.requestedRole ||
      broadcast.requestedBy ||
      parsed.heading
  );
  const classification = classificationForBroadcast(broadcast, issuerName);
  const articleUrl = absoluteWebsiteUrl(broadcast.articleUrl || parsed.reference);
  const imageUrl = absoluteWebsiteUrl(broadcast.imageUrl);
  const description = String(broadcast.excerpt || parsed.excerpt || broadcast.body || "")
    .replace(/^Official WPU News Broadcast\s*/i, "")
    .replace(/^Subject:\s*.*$/im, "")
    .replace(/^Reference:\s*.*$/im, "")
    .trim()
    .slice(0, 1200);
  const embed = new EmbedBuilder()
    .setColor(colorForIssuer(`${issuerName} ${broadcast.type}`))
    .setAuthor({ name: "Official WPU News Bulletin" })
    .setTitle(headline)
    .setDescription(description || "Official state communication issued for public record.")
    .addFields(
      {
        name: "Issued By",
        value: issuerName,
        inline: true
      },
      {
        name: "Classification",
        value: classification,
        inline: true
      },
      {
        name: "Reference ID",
        value: broadcast.linkedId || broadcast.id || "State record",
        inline: false
      }
    )
    .setFooter({ text: "Wilford Panem Union • Official State Communications" })
    .setTimestamp(new Date(broadcast.createdAt || Date.now()));

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  return embed;
}

function buildBroadcastComponents(broadcast) {
  const parsed = parseLegacyBroadcastBody(broadcast.body);
  const articleUrl = absoluteWebsiteUrl(broadcast.articleUrl || parsed.reference);

  if (!articleUrl) {
    return [];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Read Full Article")
        .setURL(articleUrl)
    )
  ];
}

function buildBroadcastApprovalEmbed(broadcast) {
  return new EmbedBuilder()
    .setColor(0xb3261e)
    .setTitle("Broadcast Approval Required")
    .setDescription(String(broadcast.body || "").slice(0, 3000))
    .addFields(
      {
        name: "Request",
        value: `${broadcast.title || "Official Broadcast"}\n${broadcast.type} / ${broadcast.distribution}`,
        inline: false
      },
      {
        name: "Requested By",
        value: `${broadcast.requestedBy || "Unknown"} / ${broadcast.requestedRole || "Unknown role"}`,
        inline: true
      },
      {
        name: "Website Review",
        value: `${websiteUrl}/government-access/broadcast-approvals`,
        inline: false
      }
    )
    .setFooter({ text: `Broadcast ID: ${broadcast.id}` })
    .setTimestamp(new Date(broadcast.createdAt || Date.now()));
}

async function notifyLemmieForBroadcastApproval(broadcast) {
  if (!lemmieDiscordUserId) {
    return;
  }

  const user = await client.users.fetch(lemmieDiscordUserId).catch(() => null);

  if (!user) {
    throw new Error("Unable to find Lemmie Discord user for broadcast approval.");
  }

  await user.send({ embeds: [buildBroadcastApprovalEmbed(broadcast)] });
  await markDiscordBroadcast(broadcast.id, {
    status: "approval_notified",
    approvalNotifiedAt: new Date().toISOString(),
    recipients: [],
    successCount: 0,
    failureCount: 0,
    failures: []
  });
}

async function sendBroadcastToChannel(broadcast, results) {
  const channelId = channelIdForBroadcast(broadcast);

  if (!channelId) {
    results.failures.push({ target: "channel", error: "No channel configured." });
    results.failureCount += 1;
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased() || channel.type === ChannelType.DM) {
    results.failures.push({ target: channelId, error: "Configured channel is not text-capable." });
    results.failureCount += 1;
    return;
  }

  await channel.send({
    embeds: [buildBroadcastEmbed(broadcast)],
    components: buildBroadcastComponents(broadcast)
  });
  results.recipients.push({ target: channelId, method: "channel" });
  results.successCount += 1;
}

async function sendBroadcastDm(userId, broadcast, results) {
  const user = await client.users.fetch(userId).catch(() => null);

  if (!user || user.bot) {
    results.failures.push({ target: userId, error: "User not found or is a bot." });
    results.failureCount += 1;
    return;
  }

  try {
    await user.send({
      embeds: [buildBroadcastEmbed(broadcast)],
      components: buildBroadcastComponents(broadcast)
    });
    results.recipients.push({ target: userId, method: "dm" });
    results.successCount += 1;
  } catch (error) {
    results.failures.push({
      target: userId,
      error: error instanceof Error ? error.message : "DM failed."
    });
    results.failureCount += 1;
  }
}

async function sendBroadcastDmAll(broadcast, results) {
  const guildId = broadcastGuildId || applicationGuildId;
  const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;

  if (!guild) {
    results.failures.push({ target: "guild", error: "DISCORD_GUILD_ID is not configured or unavailable." });
    results.failureCount += 1;
    return;
  }

  const members = await guild.members.fetch().catch(() => null);

  if (!members) {
    results.failures.push({ target: guild.id, error: "Unable to fetch guild members." });
    results.failureCount += 1;
    return;
  }

  for (const member of members.values()) {
    if (member.user.bot) {
      continue;
    }

    await sendBroadcastDm(member.user.id, broadcast, results);
    await wait(1250);
  }
}

async function processDiscordBroadcast(broadcast) {
  await markDiscordBroadcast(broadcast.id, {
    status: "processing",
    recipients: [],
    successCount: 0,
    failureCount: 0,
    failures: []
  });

  const results = {
    recipients: [],
    successCount: 0,
    failureCount: 0,
    failures: []
  };

  try {
    if (
      ["announcement", "announcement_and_dm_all", "mss_only", "government_officials"].includes(
        broadcast.distribution
      )
    ) {
      await sendBroadcastToChannel(broadcast, results);
    }

    if (broadcast.distribution === "specific_user") {
      await sendBroadcastDm(broadcast.targetDiscordId, broadcast, results);
    }

    if (["dm_all", "announcement_and_dm_all"].includes(broadcast.distribution)) {
      if (!broadcast.confirmed) {
        throw new Error("Broadcast requires confirmation before DMing all members.");
      }

      await sendBroadcastDmAll(broadcast, results);
    }

    const status = results.successCount > 0 && results.failureCount === 0 ? "completed" : "failed";
    await markDiscordBroadcast(broadcast.id, {
      status,
      processedAt: new Date().toISOString(),
      ...results,
      error: status === "failed" ? "One or more broadcast deliveries failed." : ""
    });
  } catch (error) {
    await markDiscordBroadcast(broadcast.id, {
      status: "failed",
      processedAt: new Date().toISOString(),
      ...results,
      error: error instanceof Error ? error.message : "Broadcast delivery failed."
    });
  }
}

async function postWebsiteApplicationToReview(application) {
  if (!applicationsChannelId) {
    throw new Error("DISCORD_APPLICATIONS_CHANNEL_ID is not configured.");
  }

  const channel = await client.channels.fetch(applicationsChannelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.type === ChannelType.DM) {
    throw new Error("The applications review channel is missing or not text-capable.");
  }

  const guildId = application.reviewGuildId || applicationGuildId || "";
  const pingTarget = applicationReviewRoleId
    ? `<@&${applicationReviewRoleId}>`
    : `<@${botOwnerId}>`;
  const applicantLabel = application.discordUserId
    ? `<@${application.discordUserId}>`
    : application.discordHandle || application.applicantName;
  const intro = await channel.send({
    content: `${pingTarget} New website application from ${applicantLabel}`,
    embeds: [
      new EmbedBuilder()
        .setColor(0xd7a85f)
        .setTitle(`Website Application - ${application.applicantName}`)
        .setDescription(
          [
            `**Discord:** ${application.discordHandle}`,
            application.email ? `**Email:** ${application.email}` : null,
            `**Age:** ${application.age}`,
            `**Timezone:** ${application.timezone}`,
            "",
            `**Why join Wilford?**\n${application.motivation}`,
            "",
            `**Skills and experience**\n${application.experience}`
          ]
            .filter(Boolean)
            .join("\n")
        )
        .addFields(
          {
            name: "Source",
            value: "Website Application",
            inline: true
          },
          {
            name: "Review Commands",
            value: "`-r`, `-accept`, `-deny`",
            inline: true
          }
        )
        .setFooter({ text: `Application ID: ${application.id}` })
        .setTimestamp(new Date(application.submittedAt || Date.now()))
    ]
  });

  const thread = await intro.startThread({
    name: `website-application-${application.applicantName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 90),
    autoArchiveDuration: 1440,
    reason: `Wilford website application for ${application.applicantName}`
  });

  await addReviewMembersToThread(thread, guildId);

  await updateState((state) => {
    state.applications.unshift({
      id: application.id,
      applicantId: String(application.discordUserId || "").trim(),
      applicantTag: application.discordHandle || application.applicantName,
      guildId,
      status: "pending",
      answers: [
        application.applicantName,
        application.age,
        application.timezone,
        application.motivation,
        application.experience
      ],
      reviewThreadId: thread.id,
      reviewMessageId: intro.id,
      createdAt: application.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "website",
      email: application.email || "",
      discordHandle: application.discordHandle || ""
    });
    return state;
  });

  await markWebsiteApplicationThread(application.id, {
    status: "under_review",
    reviewThreadId: thread.id,
    reviewMessageId: intro.id,
    reviewGuildId: guildId,
    discordChannelId: channel.id,
    discordThreadId: thread.id,
    discordMessageId: intro.id
  });

  await thread.send(
    application.discordUserId
      ? "Website application imported into review.\nUse `-r <message>`, `-accept [message]`, or `-deny [message]`."
      : "Website application imported into review.\nNo Discord user ID was supplied, so `-r`, `-accept`, and `-deny` cannot send DMs unless the Ministry of Credit and Records handles contact manually."
  );
}

async function getCommits() {
  const response = await fetch(`${apiUrl}/api/commits`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Commits request failed: ${response.status}`);
  }

  return response.json();
}

function formatCommitDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function buildCommitEmbed(commit) {
  const titleDate = formatCommitDate(commit.date);
  const shortSha = formatShortSha(commit.sha);
  const message = (commit.message || "New commit").slice(0, 180);

  return new EmbedBuilder()
    .setColor(0xf28c28)
    .setTitle(`Changelog - ${titleDate}`)
    .setDescription(`\`\`\`diff\n+ ${message}\n\`\`\``)
    .addFields(
      {
        name: "Repository",
        value: `[Open Commit](${commit.html_url || "https://github.com/eclipsay/wilford"})`,
        inline: true
      },
      {
        name: "SHA",
        value: `\`${shortSha}\``,
        inline: true
      }
    )
    .setFooter({
      text: `${brand.name} - ${commit.author || "Unknown author"}`
    })
    .setTimestamp(commit.date ? new Date(commit.date) : new Date());
}

async function publishCommitUpdates() {
  const [{ settings }, { commits }] = await Promise.all([getSettings(), getCommits()]);
  const channelId =
    String(settings?.discordCommitsChannelId || "").trim() ||
    String(process.env.DISCORD_COMMITS_CHANNEL_ID || "").trim();

  if (!channelId) {
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    console.log("Discord bot: commits channel is missing or not text-based.");
    return;
  }

  const state = await readState();
  const visibleCommits = Array.isArray(commits) ? commits.filter((entry) => entry?.sha) : [];

  if (!visibleCommits.length) {
    return;
  }

  if (!state.lastCommitSha) {
    await channel.send({
      embeds: [buildCommitEmbed(visibleCommits[0])]
    });

    await updateState((currentState) => ({
      ...currentState,
      lastCommitSha: visibleCommits[0].sha
    }));
    return;
  }

  const nextCommits = [];

  for (const commit of visibleCommits) {
    if (commit.sha === state.lastCommitSha) {
      break;
    }

    nextCommits.push(commit);
  }

  if (!nextCommits.length) {
    return;
  }

  for (const commit of nextCommits.reverse()) {
    await channel.send({
      embeds: [buildCommitEmbed(commit)]
    });
  }

  await updateState((currentState) => ({
    ...currentState,
    lastCommitSha: visibleCommits[0].sha
  }));
}

let isPublishing = false;
let isProcessingWebsiteApplications = false;
let isProcessingApplicationDiscordEvents = false;
let isProcessingDiscordBroadcasts = false;
let isProcessingBroadcastApprovals = false;

async function runCommitLoop() {
  if (isPublishing) {
    return;
  }

  isPublishing = true;

  try {
    await publishCommitUpdates();
  } catch (error) {
    console.log(
      `Discord bot commit publisher error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isPublishing = false;
  }
}

async function runWebsiteApplicationsLoop() {
  if (isProcessingWebsiteApplications) {
    return;
  }

  isProcessingWebsiteApplications = true;

  try {
    const applications = await getPendingWebsiteApplications();

    for (const application of applications) {
      await postWebsiteApplicationToReview(application);
    }
  } catch (error) {
    console.log(
      `Website application sync error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isProcessingWebsiteApplications = false;
  }
}

async function runApplicationDiscordEventsLoop() {
  if (isProcessingApplicationDiscordEvents) {
    return;
  }

  isProcessingApplicationDiscordEvents = true;

  try {
    const applications = await getPendingApplicationDiscordEvents();

    for (const application of applications) {
      for (const event of application.pendingDiscordEvents || []) {
        try {
          await deliverApplicationDiscordEvent(application, event);
          if (event.newStatus) {
            await setApplicationStatus(application.id, {
              status: event.newStatus,
              updatedAt: new Date().toISOString()
            });
          }
          await markApplicationDiscordEvent(application.id, event.id, {
            deliveryStatus: "delivered",
            deliveredAt: new Date().toISOString()
          });
        } catch (error) {
          await markApplicationDiscordEvent(application.id, event.id, {
            deliveryStatus: "failed",
            deliveryError: error instanceof Error ? error.message : "Unknown delivery error",
            deliveredAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.log(
      `Application Discord event error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isProcessingApplicationDiscordEvents = false;
  }
}

async function runDiscordBroadcastLoop() {
  if (isProcessingDiscordBroadcasts) {
    return;
  }

  isProcessingDiscordBroadcasts = true;

  try {
    const broadcasts = await getPendingDiscordBroadcasts();

    for (const broadcast of broadcasts) {
      await processDiscordBroadcast(broadcast);
    }
  } catch (error) {
    console.log(
      `Discord broadcast queue error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isProcessingDiscordBroadcasts = false;
  }
}

async function runBroadcastApprovalLoop() {
  if (isProcessingBroadcastApprovals) {
    return;
  }

  isProcessingBroadcastApprovals = true;

  try {
    const broadcasts = await getBroadcastApprovalRequests();

    for (const broadcast of broadcasts) {
      if (broadcast.status === "pending_approval") {
        await notifyLemmieForBroadcastApproval(broadcast);
      }
    }
  } catch (error) {
    console.log(
      `Broadcast approval notification error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isProcessingBroadcastApprovals = false;
  }
}

function buildSlashCommands() {
  return [
    new SlashCommandBuilder().setName("help").setDescription("Show all Wilford bot commands."),
    new SlashCommandBuilder().setName("ping").setDescription("Check whether the bot is online."),
    new SlashCommandBuilder()
      .setName("commands")
      .setDescription("Get the public Wilford command archive."),
    new SlashCommandBuilder()
      .setName("apply")
      .setDescription("Start a Wilford application in DMs."),
    new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Inspect a member profile.")
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to inspect.").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("purge")
      .setDescription("Delete recent messages in the current channel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("Number of messages to delete (1-100).")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      ),
    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("Temporarily timeout a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to timeout.").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("duration")
          .setDescription("Duration like 10m, 2h, or 3d.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the timeout.").setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("untimeout")
      .setDescription("Remove an active timeout from a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to untimeout.").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for removing the timeout.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a member from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to kick.").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the kick.").setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a member from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to ban.").setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("delete_days")
          .setDescription("How many days of message history to remove (0-7).")
          .setMinValue(0)
          .setMaxValue(7)
      )
      .addStringOption((option) =>
        option.setName("reason").setDescription("Reason for the ban.").setMaxLength(300)
      )
  ];
}

async function registerSlashCommands() {
  const commands = buildSlashCommands().map((command) => command.toJSON());
  const guildId = String(process.env.DISCORD_GUILD_ID || "").trim();

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(commands);
    return `guild ${guildId}`;
  }

  await client.application.commands.set(commands);
  return "global application scope";
}

async function runUserInfoReply(message, user) {
  const member = message.guild
    ? await message.guild.members.fetch(user.id).catch(() => null)
    : null;
  const roles = member
    ? member.roles.cache
        .filter((role) => role.id !== message.guild.id)
        .map((role) => role.name)
        .slice(0, 8)
        .join(", ") || "No public roles"
    : "Not in this guild";

  await message.reply(
    [
      `User: ${user.tag}`,
      `ID: ${user.id}`,
      `Created: ${user.createdAt.toLocaleString()}`,
      `Roles: ${roles}`
    ].join("\n")
  );
}

client.once("ready", () => {
  console.log(
    `${brand.name} bot logged in as ${client.user.tag}. Owner: ${botOwnerId}. Prefix: ${commandPrefix}`
  );

  registerSlashCommands()
    .then((scope) => {
      console.log(`Discord slash commands synced to ${scope}.`);
    })
    .catch((error) => {
      console.log(
        `Discord slash command sync error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    });

  runCommitLoop();
  setInterval(runCommitLoop, pollIntervalMs);
  runWebsiteApplicationsLoop();
  setInterval(runWebsiteApplicationsLoop, 20000);
  runApplicationDiscordEventsLoop();
  setInterval(runApplicationDiscordEventsLoop, 15000);
  runDiscordBroadcastLoop();
  setInterval(runDiscordBroadcastLoop, 15000);
  runBroadcastApprovalLoop();
  setInterval(runBroadcastApprovalLoop, 15000);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }

  if (message.channel.type === ChannelType.DM) {
    const session = await getActiveApplicationSession(message.author.id);

    if (session && !message.content.startsWith(commandPrefix)) {
      try {
        await continueApplicationSession(message, session);
      } catch (error) {
        await message.channel.send(
          error instanceof Error ? error.message : "Application processing failed."
        );
      }
      return;
    }

    if (!message.content.startsWith(commandPrefix)) {
      const application = await findLatestApplicationByApplicant(
        message.author.id
      );

      if (application) {
        const status = String(application.status || "pending").toLowerCase();
        const appealMatch = String(message.content || "").match(/^appeal\s*:?\s+([\s\S]+)/i);

        if (["denied", "rejected"].includes(status)) {
          if (appealMatch?.[1]?.trim()) {
            const reason = appealMatch[1].trim();

            try {
              await submitApplicationAppeal(application.id, reason);
              await setApplicationStatus(application.id, {
                status: "appealed",
                appealReason: reason
              });
              await forwardApplicantMessageToReviewThread(message, {
                ...application,
                status: "appealed"
              });
              await message.channel.send(
                "Ministry of Credit and Records: Your appeal has been received and forwarded for review."
              );
            } catch (error) {
              await message.channel.send(
                error instanceof Error
                  ? error.message
                  : "Ministry of Credit and Records: Your appeal could not be filed right now."
              );
            }
            return;
          }

          await message.channel.send(
            "Ministry of Credit and Records: Your application has already been denied. If you wish to appeal this decision, reply with APPEAL followed by your reason."
          );
          return;
        }

        if (!applicantReplyStatuses.has(normalizeApplicationStatus(status))) {
          await message.channel.send(
            `Ministry of Credit and Records: Your application is currently marked ${formatApplicationStatusLabel(status)}. Further messages have not been forwarded as a standard follow-up.`
          );
          return;
        }

        try {
          await forwardApplicantMessageToReviewThread(message, application);
          await message.channel.send(
            "Ministry of Credit and Records: Your follow-up message has been forwarded to the citizenship review thread."
          );
        } catch (error) {
          await message.channel.send(
            error instanceof Error
              ? error.message
              : "Ministry of Credit and Records: Unable to forward your message right now."
          );
        }
        return;
      }
    }
  }

  const content = String(message.content || "").trim();

  if (!content.startsWith(commandPrefix)) {
    return;
  }

  const parts = content.slice(commandPrefix.length).trim().split(/\s+/).filter(Boolean);
  const commandName = (parts.shift() || "").toLowerCase();

  try {
    if (await handleReviewThreadCommand(message, commandName, parts)) {
      return;
    }

    if (commandName === "help") {
      await message.reply(buildHelpText());
      return;
    }

    if (commandName === "ping") {
      await message.reply(`Pong. ${brand.name} command systems are online.`);
      return;
    }

    if (commandName === "commands") {
      await message.reply(`Public command archive: ${applicationCommandUrl}`);
      return;
    }

    if (commandName === "apply") {
      await beginApplicationFlow(message.author, message.guildId || "");
      if (message.channel.type !== ChannelType.DM) {
        await message.reply("I sent you a DM to begin the Wilford application.");
      }
      return;
    }

    if (commandName === "userinfo") {
      const user = message.mentions.users.first();

      if (!user || !message.guild) {
        await message.reply("Use `-userinfo @user` inside a server.");
        return;
      }

      await runUserInfoReply(message, user);
      return;
    }

    if (commandName === "purge") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.ManageMessages)) {
        await message.reply("You need `Manage Messages` to use this command.");
        return;
      }

      const amount = Number.parseInt(parts[0] || "", 10);

      if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
        await message.reply("Use `-purge <1-100>`.");
        return;
      }

      if (typeof message.channel.bulkDelete !== "function") {
        await message.reply("This command can only be used in a standard text channel.");
        return;
      }

      const deleted = await message.channel.bulkDelete(amount + 1, true);
      const totalDeleted = Math.max(0, deleted.size - 1);

      await message.channel
        .send(`Deleted ${totalDeleted} recent message${totalDeleted === 1 ? "" : "s"}.`)
        .then((sent) => setTimeout(() => sent.delete().catch(() => null), 4000))
        .catch(() => null);
      return;
    }

    if (commandName === "timeout") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.ModerateMembers)) {
        await message.reply("You need `Moderate Members` to use this command.");
        return;
      }

      const user = message.mentions.users.first();
      const durationInput = parts[1];
      const durationMs = parseTimeoutDuration(durationInput);

      if (!message.guild || !user || !durationMs) {
        await message.reply("Use `-timeout @user <10m|2h|3d> [reason]`.");
        return;
      }

      if (user.id === message.author.id) {
        await message.reply("You cannot timeout yourself.");
        return;
      }

      const member = await message.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await message.reply("That member could not be found in this server.");
        return;
      }

      if (!member.moderatable) {
        await message.reply(
          "I cannot timeout that member because of role hierarchy or permissions."
        );
        return;
      }

      const reason = getReason(parts, 2, `Timed out by ${message.author.tag}`);
      await member.timeout(durationMs, reason);
      await message.reply(`${user.tag} has been timed out for ${durationInput}.`);
      return;
    }

    if (commandName === "untimeout") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.ModerateMembers)) {
        await message.reply("You need `Moderate Members` to use this command.");
        return;
      }

      const user = message.mentions.users.first();

      if (!message.guild || !user) {
        await message.reply("Use `-untimeout @user [reason]`.");
        return;
      }

      const member = await message.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await message.reply("That member could not be found in this server.");
        return;
      }

      if (!member.moderatable) {
        await message.reply(
          "I cannot remove the timeout from that member because of role hierarchy or permissions."
        );
        return;
      }

      const reason = getReason(parts, 1, `Timeout cleared by ${message.author.tag}`);
      await member.timeout(null, reason);
      await message.reply(`${user.tag} is no longer timed out.`);
      return;
    }

    if (commandName === "kick") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.KickMembers)) {
        await message.reply("You need `Kick Members` to use this command.");
        return;
      }

      const user = message.mentions.users.first();

      if (!message.guild || !user) {
        await message.reply("Use `-kick @user [reason]`.");
        return;
      }

      if (user.id === message.author.id) {
        await message.reply("You cannot kick yourself.");
        return;
      }

      const member = await message.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await message.reply("That member could not be found in this server.");
        return;
      }

      if (!member.kickable) {
        await message.reply("I cannot kick that member because of role hierarchy or permissions.");
        return;
      }

      const reason = getReason(parts, 1, `Kicked by ${message.author.tag}`);
      await member.kick(reason);
      await message.reply(`${user.tag} has been kicked.`);
      return;
    }

    if (commandName === "ban") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.BanMembers)) {
        await message.reply("You need `Ban Members` to use this command.");
        return;
      }

      const user = message.mentions.users.first();

      if (!message.guild || !user) {
        await message.reply("Use `-ban @user [0-7 message days] [reason]`.");
        return;
      }

      if (user.id === message.author.id) {
        await message.reply("You cannot ban yourself.");
        return;
      }

      const deleteDaysCandidate = Number.parseInt(parts[1] || "", 10);
      const deleteDays =
        Number.isInteger(deleteDaysCandidate) &&
        deleteDaysCandidate >= 0 &&
        deleteDaysCandidate <= 7
          ? deleteDaysCandidate
          : 0;
      const reasonStartIndex = deleteDays === 0 && parts[1] !== "0" ? 1 : 2;
      const reason = getReason(parts, reasonStartIndex, `Banned by ${message.author.tag}`);
      const member = await message.guild.members.fetch(user.id).catch(() => null);

      if (member && !member.bannable) {
        await message.reply("I cannot ban that member because of role hierarchy or permissions.");
        return;
      }

      await message.guild.members.ban(user.id, {
        reason,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60
      });

      await message.reply(`${user.tag} has been banned.`);
    }
  } catch (error) {
    await message.reply(
      error instanceof Error
        ? error.message
        : "Something went wrong while running that command."
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    if (interaction.commandName === "help") {
      await interaction.reply({
        content: buildHelpText(),
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "ping") {
      await interaction.reply({
        content: `Pong. ${brand.name} command systems are online.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "commands") {
      await interaction.reply({
        content: `Public command archive: ${applicationCommandUrl}`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "apply") {
      await beginApplicationFlow(interaction.user, interaction.guildId || "");
      await interaction.reply({
        content: "I sent you a DM to begin the Wilford application.",
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "userinfo") {
      const user = interaction.options.getUser("user", true);

      if (!interaction.guild) {
        await interaction.reply({
          content: "This command is only available in a server.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const roles = member
        ? member.roles.cache
            .filter((role) => role.id !== interaction.guild.id)
            .map((role) => role.name)
            .slice(0, 8)
            .join(", ") || "No public roles"
        : "Not in this guild";

      await interaction.reply({
        content: [
          `User: ${user.tag}`,
          `ID: ${user.id}`,
          `Created: ${user.createdAt.toLocaleString()}`,
          `Roles: ${roles}`
        ].join("\n"),
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "purge") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ManageMessages)) {
        await interaction.reply({
          content: "You need `Manage Messages` to use this command.",
          ephemeral: true
        });
        return;
      }

      const amount = interaction.options.getInteger("amount", true);

      if (
        !interaction.channel?.isTextBased() ||
        typeof interaction.channel.bulkDelete !== "function"
      ) {
        await interaction.reply({
          content: "This command can only be used in a standard text channel.",
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply(
        `Deleted ${deleted.size} recent message${deleted.size === 1 ? "" : "s"}.`
      );
      return;
    }

    if (interaction.commandName === "timeout") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ModerateMembers)) {
        await interaction.reply({
          content: "You need `Moderate Members` to use this command.",
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser("user", true);
      const durationInput = interaction.options.getString("duration", true);
      const durationMs = parseTimeoutDuration(durationInput);

      if (!durationMs) {
        await interaction.reply({
          content: "Use a valid duration like `10m`, `2h`, or `3d` up to 28 days.",
          ephemeral: true
        });
        return;
      }

      if (user.id === interaction.user.id) {
        await interaction.reply({
          content: "You cannot timeout yourself.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await interaction.reply({
          content: "That member could not be found in this server.",
          ephemeral: true
        });
        return;
      }

      if (!member.moderatable) {
        await interaction.reply({
          content: "I cannot timeout that member because of role hierarchy or permissions.",
          ephemeral: true
        });
        return;
      }

      const reason =
        interaction.options.getString("reason") || `Timed out by ${interaction.user.tag}`;
      await member.timeout(durationMs, reason);
      await interaction.reply({
        content: `${user.tag} has been timed out for ${durationInput}.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "untimeout") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ModerateMembers)) {
        await interaction.reply({
          content: "You need `Moderate Members` to use this command.",
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await interaction.reply({
          content: "That member could not be found in this server.",
          ephemeral: true
        });
        return;
      }

      if (!member.moderatable) {
        await interaction.reply({
          content:
            "I cannot remove the timeout from that member because of role hierarchy or permissions.",
          ephemeral: true
        });
        return;
      }

      const reason =
        interaction.options.getString("reason") || `Timeout cleared by ${interaction.user.tag}`;
      await member.timeout(null, reason);
      await interaction.reply({
        content: `${user.tag} is no longer timed out.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "kick") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.KickMembers)) {
        await interaction.reply({
          content: "You need `Kick Members` to use this command.",
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser("user", true);

      if (user.id === interaction.user.id) {
        await interaction.reply({
          content: "You cannot kick yourself.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await interaction.reply({
          content: "That member could not be found in this server.",
          ephemeral: true
        });
        return;
      }

      if (!member.kickable) {
        await interaction.reply({
          content: "I cannot kick that member because of role hierarchy or permissions.",
          ephemeral: true
        });
        return;
      }

      const reason =
        interaction.options.getString("reason") || `Kicked by ${interaction.user.tag}`;
      await member.kick(reason);
      await interaction.reply({
        content: `${user.tag} has been kicked.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === "ban") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.BanMembers)) {
        await interaction.reply({
          content: "You need `Ban Members` to use this command.",
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser("user", true);

      if (user.id === interaction.user.id) {
        await interaction.reply({
          content: "You cannot ban yourself.",
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (member && !member.bannable) {
        await interaction.reply({
          content: "I cannot ban that member because of role hierarchy or permissions.",
          ephemeral: true
        });
        return;
      }

      const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
      const reason =
        interaction.options.getString("reason") || `Banned by ${interaction.user.tag}`;

      await interaction.guild.members.ban(user.id, {
        reason,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60
      });

      await interaction.reply({
        content: `${user.tag} has been banned.`,
        ephemeral: true
      });
    }
  } catch (error) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        error instanceof Error
          ? error.message
          : "Something went wrong while running that command."
      );
      return;
    }

    await interaction.reply({
      content:
        error instanceof Error
          ? error.message
          : "Something went wrong while running that command.",
      ephemeral: true
    });
  }
});

client.login(token);
