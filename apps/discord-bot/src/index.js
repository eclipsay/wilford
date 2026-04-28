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
  formatCredits,
  formatShortSha,
  publicBotCommands,
  staffApplicationCommands,
  taxLabel,
  titleForBalance
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
const enemiesOfStateChannelId = String(process.env.ENEMIES_OF_STATE_CHANNEL_ID || "").trim();
const courtAnnouncementsChannelId = String(process.env.COURT_ANNOUNCEMENTS_CHANNEL_ID || "").trim();
const activeHearingsChannelId = String(process.env.ACTIVE_HEARINGS_CHANNEL_ID || "").trim();
const sentencingRecordsChannelId = String(process.env.SENTENCING_RECORDS_CHANNEL_ID || "").trim();
const petitionsToCourtChannelId = String(process.env.PETITIONS_TO_COURT_CHANNEL_ID || "").trim();
const legalArchivesChannelId = String(process.env.LEGAL_ARCHIVES_CHANNEL_ID || "").trim();
const pardonsClemencyChannelId = String(process.env.PARDONS_CLEMENCY_CHANNEL_ID || "").trim();
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

async function readEconomyStore() {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required for Panem Credit commands.");
  }

  const response = await fetch(`${apiUrl}/api/admin/economy-store`, {
    headers: { "x-admin-key": adminApiKey },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Panem Credit ledger unavailable (${response.status}).`);
  }

  const parsed = await response.json();
  return parsed.economy || parsed;
}

async function writeEconomyStore(economy) {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required for Panem Credit commands.");
  }

  const response = await fetch(`${apiUrl}/api/admin/economy-store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify({ economy }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Panem Credit ledger write failed (${response.status}).`);
  }

  const parsed = await response.json();
  return parsed.economy || parsed;
}

async function readGovernmentAccessStore() {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required for citizen registry checks.");
  }

  const response = await fetch(`${apiUrl}/api/admin/government-access-store`, {
    headers: { "x-admin-key": adminApiKey },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Citizen registry unavailable (${response.status}).`);
  }

  return response.json();
}

function getEconomyWallet(economy, id) {
  return (economy.wallets || []).find(
    (wallet) => wallet.id === id || wallet.userId === id || wallet.discordId === id
  );
}

function ensureDiscordWallet(economy, user) {
  let wallet = getEconomyWallet(economy, user.id);
  if (wallet) {
    return wallet;
  }

  wallet = {
    id: createId("wallet"),
    userId: `discord-${user.id}`,
    discordId: user.id,
    displayName: user.tag || user.username,
    balance: 500,
    district: "",
    status: "active",
      title: "",
      salary: 125,
      taxStatus: "compliant",
    exempt: false,
    underReview: false,
    linkedEnemyRecordId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  economy.wallets = [wallet, ...(economy.wallets || [])];
  return wallet;
}

function getVerifiedDiscordCitizen(governmentStore, economy, user) {
  const discordId = String(user?.id || "").trim();
  const citizen = (governmentStore.citizenRecords || []).find((record) =>
    String(record.discordId || "").trim() === discordId &&
    record.verificationStatus === "Verified" &&
    !record.lostOrStolen &&
    !["Revoked", "Enemy of the State"].includes(record.securityClassification)
  );

  if (!citizen) {
    return null;
  }

  const wallet = getEconomyWallet(economy, citizen.walletId || citizen.userId || citizen.discordId);
  if (!wallet) {
    return { citizen, wallet: null };
  }

  return { citizen, wallet };
}

function citizenRequiredEmbed() {
  return ministryEmbed(
    "Citizen Registration Required",
    `Panem Credit commands require verified citizenship and a linked wallet.\nApply at ${websiteUrl}/citizenship or contact the Ministry of Credit & Records with your Discord ID.`
  );
}

function walletLinkRequiredEmbed() {
  return ministryEmbed(
    "Wallet Link Required",
    "Your citizen identity is verified, but no Panem Credit wallet is linked to your Union Security record. Contact the Ministry of Credit & Records."
  );
}

function pushEconomyTransaction(economy, transaction) {
  economy.transactions = [
    {
      id: createId("txn"),
      taxAmount: 0,
      createdAt: new Date().toISOString(),
      createdBy: "discord-bot",
      ...transaction
    },
    ...(economy.transactions || [])
  ].slice(0, 1000);
}

function ministryEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xd7a85f)
    .setAuthor({ name: "Ministry of Credit & Records" })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "Taxation sustains the Union." })
    .setTimestamp(new Date());
}

function requireEconomyAdmin(interaction) {
  return hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ManageGuild);
}

async function replyEconomy(interaction, embed, ephemeral = false) {
  await interaction.reply({ embeds: [embed], ephemeral });
}

async function handleEconomySlashCommand(interaction) {
  const name = interaction.commandName;
  const citizenEconomyCommands = new Set([
    "balance",
    "pay",
    "transactions",
    "daily",
    "tax",
    "market",
    "buy",
    "sell",
    "district",
    "leaderboard"
  ]);
  const adminEconomyCommands = new Set([
    "grant",
    "fine",
    "freeze-wallet",
    "unfreeze-wallet",
    "set-tax",
    "run-tax",
    "economy-report"
  ]);
  const economyCommands = new Set([...citizenEconomyCommands, ...adminEconomyCommands]);

  if (!economyCommands.has(name)) {
    return false;
  }

  const economy = await readEconomyStore();
  const governmentStore = await readGovernmentAccessStore();
  const identity = getVerifiedDiscordCitizen(governmentStore, economy, interaction.user);

  if (citizenEconomyCommands.has(name)) {
    if (!identity) {
      await replyEconomy(interaction, citizenRequiredEmbed(), true);
      return true;
    }
    if (!identity.wallet) {
      await replyEconomy(interaction, walletLinkRequiredEmbed(), true);
      return true;
    }
  }

  const wallet = identity?.wallet;

  if (name === "balance") {
    await replyEconomy(
      interaction,
      ministryEmbed("Panem Credit Balance", `${identity.citizen.name}\n${wallet.displayName}\n${formatCredits(wallet.balance)}\n${wallet.title || titleForBalance(wallet.balance)} / ${wallet.status}`)
    );
    return true;
  }

  if (name === "pay") {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getNumber("amount", true);
    const recipientIdentity = getVerifiedDiscordCitizen(governmentStore, economy, target);
    if (!recipientIdentity) {
      await replyEconomy(interaction, ministryEmbed("Transfer Rejected", "The recipient is not a verified citizen with a registered Discord ID."), true);
      return true;
    }
    const recipient = recipientIdentity.wallet;
    if (!recipient) {
      await replyEconomy(interaction, ministryEmbed("Transfer Rejected", "The recipient has no linked Panem Credit wallet."), true);
      return true;
    }
    if (wallet.status !== "active" || recipient.status === "frozen" || amount <= 0 || wallet.balance < amount) {
      await replyEconomy(interaction, ministryEmbed("Transfer Rejected", "The wallet status or balance cannot support this payment."));
      return true;
    }
    const rate = Number(economy.taxRates?.trade_tax || 0.05);
    const taxAmount = Math.round(amount * rate * 100) / 100;
    const total = amount + taxAmount;
    if (wallet.balance < total) {
      await replyEconomy(interaction, ministryEmbed("Transfer Rejected", "Insufficient balance after trade tax."));
      return true;
    }
    wallet.balance -= total;
    recipient.balance += amount;
    pushEconomyTransaction(economy, {
      fromWalletId: wallet.id,
      toWalletId: recipient.id,
      amount,
      type: "discord_pay",
      reason: `Discord payment to ${target.tag}`,
      taxAmount,
      createdBy: interaction.user.id
    });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Payment Recorded", `${formatCredits(amount)} sent to ${target.tag}.\nTrade tax: ${formatCredits(taxAmount)}.`));
    return true;
  }

  if (name === "transactions") {
    const rows = (economy.transactions || [])
      .filter((transaction) => transaction.fromWalletId === wallet.id || transaction.toWalletId === wallet.id)
      .slice(0, 8)
      .map((transaction) => `${transaction.type}: ${formatCredits(transaction.amount)} - ${transaction.reason}`)
      .join("\n") || "No transactions recorded.";
    await replyEconomy(interaction, ministryEmbed("Recent Transactions", rows));
    return true;
  }

  if (name === "daily") {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyClaimed = (economy.transactions || []).some(
      (transaction) =>
        transaction.toWalletId === wallet.id &&
        transaction.type === "daily_stipend" &&
        String(transaction.createdAt || "").startsWith(today)
    );
    if (alreadyClaimed) {
      await replyEconomy(interaction, ministryEmbed("Daily Stipend", "Your civic stipend has already been claimed today."));
      return true;
    }
    const salary = Math.max(0, Number(wallet.salary ?? 125));
    wallet.balance += salary;
    pushEconomyTransaction(economy, {
      fromWalletId: "treasury",
      toWalletId: wallet.id,
      amount: salary,
      type: "daily_stipend",
      reason: "Daily civic salary",
      createdBy: interaction.user.id
    });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Daily Civic Salary", `${formatCredits(salary)} has been issued to your wallet.`));
    return true;
  }

  if (name === "tax") {
    const records = (economy.taxRecords || []).filter((record) => record.walletId === wallet.id).slice(0, 8);
    const paid = records.filter((record) => record.status === "paid").reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const lines = records.map((record) => `${taxLabel(record.taxType)}: ${formatCredits(record.amount)} (${record.status})`).join("\n") || "No tax records.";
    await replyEconomy(interaction, ministryEmbed("Tax Status", `Status: ${wallet.taxStatus}\nPaid in recent records: ${formatCredits(paid)}\n\n${lines}`));
    return true;
  }

  if (name === "market") {
    const rows = (economy.marketItems || []).slice(0, 12).map((item) => `${item.name} (${item.district}) - ${formatCredits(item.currentPrice || item.basePrice)} / stock ${item.stock}`).join("\n");
    await replyEconomy(interaction, ministryEmbed("Marketplace Listings", rows || "No goods listed."));
    return true;
  }

  if (name === "buy") {
    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity", true);
    const item = (economy.marketItems || []).find((entry) => entry.id === itemId || entry.name.toLowerCase() === itemId.toLowerCase());
    if (!item || item.stock < quantity || wallet.status !== "active") {
      await replyEconomy(interaction, ministryEmbed("Purchase Rejected", "The requested good is unavailable or your wallet is restricted."));
      return true;
    }
    const subtotal = Number(item.currentPrice || item.basePrice || 0) * quantity;
    const taxType = item.category === "Luxury Goods" ? "luxury_goods_tax" : "trade_tax";
    const taxAmount = Math.round(subtotal * Number(economy.taxRates?.[taxType] || 0) * 100) / 100;
    if (wallet.balance < subtotal + taxAmount) {
      await replyEconomy(interaction, ministryEmbed("Purchase Rejected", "Insufficient Panem Credit balance."));
      return true;
    }
    wallet.balance -= subtotal + taxAmount;
    item.stock -= quantity;
    pushEconomyTransaction(economy, {
      fromWalletId: wallet.id,
      toWalletId: "market",
      amount: subtotal,
      type: "market_buy",
      reason: `${quantity} x ${item.name}`,
      taxAmount,
      createdBy: interaction.user.id
    });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Purchase Approved", `${quantity} x ${item.name}\nTotal: ${formatCredits(subtotal + taxAmount)}.`));
    return true;
  }

  if (name === "sell") {
    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity", true);
    const price = interaction.options.getNumber("price", true);
    const item = (economy.marketItems || []).find((entry) => entry.id === itemId || entry.name.toLowerCase() === itemId.toLowerCase());
    if (!item || wallet.status !== "active") {
      await replyEconomy(interaction, ministryEmbed("Listing Rejected", "That item cannot be listed from this wallet."));
      return true;
    }
    economy.listings = [
      {
        id: createId("listing"),
        sellerWalletId: wallet.id,
        itemId: item.id,
        quantity,
        price,
        status: "active",
        createdAt: new Date().toISOString()
      },
      ...(economy.listings || [])
    ];
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Listing Created", `${quantity} x ${item.name} listed at ${formatCredits(price)} each.`));
    return true;
  }

  if (name === "district") {
    const district = (economy.districts || []).find((entry) => entry.name === wallet.district) || economy.districts?.[0];
    await replyEconomy(interaction, ministryEmbed("District Economy", `${district?.name || "Unassigned"}\n${district?.goodsProduced || "No assignment"}\nSupply ${district?.supplyLevel || 0} / Demand ${district?.demandLevel || 0} / Prosperity ${district?.prosperityRating || 0}`));
    return true;
  }

  if (name === "leaderboard") {
    const rows = [...(economy.wallets || [])]
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 10)
      .map((entry, index) => `${index + 1}. ${entry.displayName} - ${formatCredits(entry.balance)}`)
      .join("\n");
    await replyEconomy(interaction, ministryEmbed("Panem Credit Leaderboard", rows));
    return true;
  }

  if (!requireEconomyAdmin(interaction)) {
    await replyEconomy(interaction, ministryEmbed("Access Denied", "This treasury command requires administrative authority."));
    return true;
  }

  const target = interaction.options.getUser("user");
  const targetIdentity = target ? getVerifiedDiscordCitizen(governmentStore, economy, target) : null;
  const targetWallet = targetIdentity?.wallet || null;
  const amount = interaction.options.getNumber("amount") || 0;
  const reason = interaction.options.getString("reason") || "Treasury action";

  if (target && !targetIdentity) {
    await replyEconomy(interaction, ministryEmbed("Citizen Required", `${target.tag} does not have a verified citizen record linked to their Discord ID.`), true);
    return true;
  }

  if (target && !targetWallet) {
    await replyEconomy(interaction, ministryEmbed("Wallet Required", `${target.tag} has a citizen record but no linked Panem Credit wallet.`), true);
    return true;
  }

  if (name === "grant" && targetWallet) {
    targetWallet.balance += amount;
    pushEconomyTransaction(economy, { fromWalletId: "treasury", toWalletId: targetWallet.id, amount, type: "grant", reason, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Grant Issued", `${formatCredits(amount)} issued to ${target.tag}.`));
    return true;
  }

  if (name === "fine" && targetWallet) {
    targetWallet.balance = Math.max(0, targetWallet.balance - amount);
    targetWallet.taxStatus = "penalty issued";
    pushEconomyTransaction(economy, { fromWalletId: targetWallet.id, toWalletId: "treasury", amount, type: "fine", reason, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Fine Issued", `${formatCredits(amount)} fined from ${target.tag}.`));
    return true;
  }

  if ((name === "freeze-wallet" || name === "unfreeze-wallet") && targetWallet) {
    targetWallet.status = name === "freeze-wallet" ? "frozen" : "active";
    pushEconomyTransaction(economy, { fromWalletId: targetWallet.id, toWalletId: targetWallet.id, amount: 0, type: name, reason, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Wallet Status Updated", `${target.tag} is now ${targetWallet.status}.`));
    return true;
  }

  if (name === "set-tax") {
    const type = interaction.options.getString("type", true);
    const rate = interaction.options.getNumber("rate", true);
    economy.taxRates = { ...(economy.taxRates || {}), [type]: rate };
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Tax Rate Set", `${taxLabel(type)} set to ${(rate * 100).toFixed(1)}%.`));
    return true;
  }

  if (name === "run-tax") {
    const rate = Number(economy.taxRates?.income_tax || 0.08);
    for (const entry of economy.wallets || []) {
      if (entry.exempt || entry.status === "frozen") continue;
      const taxAmount = Math.max(1, Math.round(Number(entry.balance || 0) * rate * 100) / 100);
      entry.balance = Math.max(0, Number(entry.balance || 0) - taxAmount);
      (economy.taxRecords ||= []).unshift({ id: createId("tax"), walletId: entry.id, taxType: "income_tax", amount: taxAmount, rate, status: "paid", createdAt: new Date().toISOString() });
      pushEconomyTransaction(economy, { fromWalletId: entry.id, toWalletId: "treasury", amount: taxAmount, type: "income_tax", reason: "Taxation sustains the Union.", taxAmount, createdBy: interaction.user.id });
    }
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Automatic Taxation Complete", "Income tax has been applied to eligible wallets."));
    return true;
  }

  if (name === "economy-report") {
    const total = (economy.wallets || []).reduce((sum, entry) => sum + Number(entry.balance || 0), 0);
    const frozen = (economy.wallets || []).filter((entry) => entry.status === "frozen").length;
    await replyEconomy(interaction, ministryEmbed("Economy Report", `Wallets: ${(economy.wallets || []).length}\nTotal supply: ${formatCredits(total)}\nFrozen wallets: ${frozen}\nAlerts: ${(economy.alerts || []).length}`));
    return true;
  }

  return true;
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

async function readSupremeCourtStore() {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is not configured for court petitions.");
  }

  const response = await fetch(`${apiUrl}/api/admin/supreme-court-store`, {
    headers: { "x-admin-key": adminApiKey },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supreme Court store request failed: ${response.status}`);
  }

  return response.json();
}

async function writeSupremeCourtStore(store) {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is not configured for court petitions.");
  }

  const response = await fetch(`${apiUrl}/api/admin/supreme-court-store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminApiKey
    },
    body: JSON.stringify(store),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supreme Court store write failed: ${response.status}`);
  }

  return response.json().catch(() => null);
}

async function submitCourtPetitionFromDiscord(user, fields) {
  const store = await readSupremeCourtStore();
  const petition = {
    id: createId("court-petition"),
    petitionerDiscordId: user.id,
    petitionerName: user.tag,
    subject: cleanBroadcastLine(fields.subject).slice(0, 160),
    requestType: cleanBroadcastLine(fields.requestType).toLowerCase(),
    statement: String(fields.statement || "").trim().slice(0, 3000),
    status: "pending",
    internalNotes: "",
    discordMessageId: "",
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const nextPetitions = [petition, ...(store.supremeCourtPetitions || [])].slice(0, 500);
  await writeSupremeCourtStore({
    supremeCourtCases: store.supremeCourtCases || [],
    supremeCourtPetitions: nextPetitions
  });

  if (petitionsToCourtChannelId) {
    const channel = await client.channels.fetch(petitionsToCourtChannelId).catch(() => null);
    if (channel?.isTextBased() && channel.type !== ChannelType.DM) {
      const sent = await channel.send({
        embeds: [
          buildCourtBroadcastEmbed({
            type: "court_petition",
            title: `Court Petition: ${petition.subject}`,
            body: petition.statement,
            metadata: { petition },
            imageUrl: "/wpu-grand-seal.png",
            createdAt: petition.submittedAt
          })
        ]
      });
      petition.discordMessageId = sent.id;
      await writeSupremeCourtStore({
        supremeCourtCases: store.supremeCourtCases || [],
        supremeCourtPetitions: [petition, ...(store.supremeCourtPetitions || [])].slice(0, 500)
      });
    }
  }

  return petition;
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

async function getPendingEnemyRegistryEvents() {
  if (!adminApiKey) {
    return [];
  }

  const response = await fetch(`${apiUrl}/api/admin/enemies-of-state/discord-events`, {
    headers: { "x-admin-key": adminApiKey },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Enemy registry events request failed: ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  return Array.isArray(payload?.events) ? payload.events : [];
}

async function markEnemyRegistryEvent(eventId, payload) {
  if (!adminApiKey) {
    return;
  }

  await fetch(`${apiUrl}/api/admin/enemies-of-state/discord-events/${encodeURIComponent(eventId)}`, {
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
  const courtTargets = {
    court_announcement: courtAnnouncementsChannelId,
    court_notice: courtAnnouncementsChannelId,
    active_hearing: activeHearingsChannelId,
    court_hearing: activeHearingsChannelId,
    sentencing_record: sentencingRecordsChannelId,
    court_sentencing: sentencingRecordsChannelId,
    court_petition: petitionsToCourtChannelId,
    legal_archive: legalArchivesChannelId,
    court_archive: legalArchivesChannelId,
    clemency_notice: pardonsClemencyChannelId,
    court_clemency: pardonsClemencyChannelId
  };

  if (courtTargets[broadcast.distribution] || courtTargets[broadcast.type]) {
    return courtTargets[broadcast.distribution] || courtTargets[broadcast.type];
  }

  if (broadcast.distribution === "mss_only" || broadcast.distribution === "government_officials") {
    return mssChannelId || announcementChannelId;
  }

  return announcementChannelId;
}

function channelIdsForBroadcast(broadcast) {
  const primary = channelIdForBroadcast(broadcast);
  const ids = primary ? [primary] : [];
  const courtCase = broadcast.metadata?.courtCase || {};

  if (
    isCourtBroadcast(broadcast) &&
    (broadcast.distribution === "active_hearing" ||
      broadcast.type === "court_hearing" ||
      courtCase.status === "Hearing Scheduled") &&
    courtAnnouncementsChannelId
  ) {
    ids.unshift(courtAnnouncementsChannelId);
  }

  return [...new Set(ids)];
}

function isCourtBroadcast(broadcast) {
  return String(broadcast.type || "").startsWith("court_") ||
    String(broadcast.distribution || "").startsWith("court_") ||
    ["active_hearing", "sentencing_record", "legal_archive", "clemency_notice"].includes(broadcast.distribution);
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

async function getLinkedBroadcastArticle(broadcast) {
  if (broadcast.linkedType !== "article" || !broadcast.linkedId) {
    return null;
  }

  const response = await fetch(`${apiUrl}/api/content`, {
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return articles.find((article) => article.id === broadcast.linkedId) || null;
}

async function enrichArticleBroadcast(broadcast) {
  const article = await getLinkedBroadcastArticle(broadcast);

  if (!article) {
    return broadcast;
  }

  const articleImage =
    article.imageUrl ||
    article.heroImage ||
    article.image ||
    article.thumbnail ||
    article.thumbnailUrl ||
    "";

  return {
    ...broadcast,
    headline: broadcast.headline || article.title,
    excerpt: broadcast.excerpt || article.subtitle || article.body,
    issuer: broadcast.issuer || article.source || article.category,
    classification: broadcast.classification || article.category || "Official News",
    imageUrl: broadcast.imageUrl || articleImage,
    articleUrl: broadcast.articleUrl || `/news/${article.id}`
  };
}

function buildBroadcastEmbed(broadcast) {
  if (isCourtBroadcast(broadcast)) {
    return buildCourtBroadcastEmbed(broadcast);
  }

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

function firstRegistryReference(entry) {
  return entry.relatedCaseUrl || entry.relatedArticleUrl || entry.relatedBulletinUrl || `${websiteUrl}/enemies-of-the-state`;
}

function buildEnemyRegistryEmbed(entry) {
  const reference = absoluteWebsiteUrl(firstRegistryReference(entry));
  const statusPhrase =
    entry.status === "Cleared" || entry.status === "Pardoned"
      ? `${entry.name} has been cleared by order of ${entry.issuingAuthority || "the Ministry of State Security"}.`
      : `${entry.name} is classified as ${entry.classification || "Person of Interest"} and listed by order of ${entry.issuingAuthority || "the Ministry of State Security"}.`;
  const embed = new EmbedBuilder()
    .setColor(0x7f1515)
    .setTitle("MSS ENEMY OF THE STATE NOTICE")
    .setDescription(statusPhrase)
    .addFields(
      { name: "Name", value: cleanBroadcastLine(entry.alias ? `${entry.name} / ${entry.alias}` : entry.name), inline: false },
      { name: "Classification", value: cleanBroadcastLine(entry.classification || "Person of Interest"), inline: true },
      { name: "Threat Level", value: cleanBroadcastLine(entry.threatLevel || "Low"), inline: true },
      { name: "Status", value: cleanBroadcastLine(entry.status || "Under MSS Review"), inline: true },
      { name: "Reason", value: String(entry.reasonSummary || "Under MSS review.").slice(0, 1024), inline: false },
      { name: "Issuing Authority", value: cleanBroadcastLine(entry.issuingAuthority || "Ministry of State Security"), inline: true },
      { name: "Reference", value: reference || `${websiteUrl}/enemies-of-the-state`, inline: false }
    )
    .setFooter({ text: "Ministry of State Security • Wilford Panem Union" })
    .setTimestamp(new Date(entry.updatedAt || entry.createdAt || Date.now()));

  const imageUrl = absoluteWebsiteUrl(entry.imageUrl);
  if (imageUrl) {
    embed.setThumbnail(imageUrl);
  }

  return embed;
}

function buildEnemyRegistryComponents(entry) {
  const reference = absoluteWebsiteUrl(firstRegistryReference(entry));

  if (!reference) {
    return [];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Registry")
        .setStyle(ButtonStyle.Link)
        .setURL(reference)
    )
  ];
}

async function processEnemyRegistryEvent(event) {
  const entry = event.entry;
  const channelId = enemiesOfStateChannelId || mssChannelId || announcementChannelId;

  if (!channelId) {
    await markEnemyRegistryEvent(event.id, {
      status: "failed",
      error: "ENEMIES_OF_STATE_CHANNEL_ID is not configured."
    });
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased() || channel.type === ChannelType.DM) {
    await markEnemyRegistryEvent(event.id, {
      status: "failed",
      error: "Configured enemy registry channel is not text-capable."
    });
    return;
  }

  try {
    const shouldDelete =
      event.action === "archive" &&
      (entry.archived || entry.visibility !== "Public Registry" || !entry.approvedPublic);
    const existingMessage = entry.discordMessageId
      ? await channel.messages.fetch(entry.discordMessageId).catch(() => null)
      : null;

    if (shouldDelete && existingMessage) {
      await existingMessage.delete().catch(() => null);
      await markEnemyRegistryEvent(event.id, {
        status: "delivered",
        discordChannelId: channel.id,
        discordMessageId: ""
      });
      return;
    }

    if (existingMessage) {
      await existingMessage.edit({
        embeds: [buildEnemyRegistryEmbed(entry)],
        components: buildEnemyRegistryComponents(entry)
      });
      await markEnemyRegistryEvent(event.id, {
        status: "delivered",
        discordChannelId: channel.id,
        discordMessageId: existingMessage.id
      });
      return;
    }

    if (shouldDelete) {
      await markEnemyRegistryEvent(event.id, {
        status: "delivered",
        discordChannelId: channel.id,
        discordMessageId: ""
      });
      return;
    }

    const sent = await channel.send({
      embeds: [buildEnemyRegistryEmbed(entry)],
      components: buildEnemyRegistryComponents(entry)
    });
    await markEnemyRegistryEvent(event.id, {
      status: "delivered",
      discordChannelId: channel.id,
      discordMessageId: sent.id
    });
  } catch (error) {
    await markEnemyRegistryEvent(event.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Enemy registry mirror failed."
    });
  }
}

function buildCourtBroadcastEmbed(broadcast) {
  const courtCase = broadcast.metadata?.courtCase || {};
  const petition = broadcast.metadata?.petition || {};
  const clemency = broadcast.metadata?.clemency || {};
  const linkedUrl = absoluteWebsiteUrl(courtCase.publicCaseUrl || broadcast.articleUrl);
  const description = String(
    broadcast.excerpt ||
      broadcast.body ||
      petition.statement ||
      clemency.statement ||
      "Official Supreme Court notice entered for public record."
  ).trim().slice(0, 1400);
  const embed = new EmbedBuilder()
    .setColor(broadcast.type === "court_clemency" ? 0xd7a85f : 0xc0c0c0)
    .setTitle("Supreme Court Notice")
    .setDescription(description)
    .setFooter({ text: "Supreme Court of the Wilford Panem Union" })
    .setTimestamp(new Date(broadcast.createdAt || Date.now()));

  const sealUrl = absoluteWebsiteUrl(broadcast.imageUrl || "/wpu-grand-seal.png");
  if (sealUrl) {
    embed.setThumbnail(sealUrl);
  }

  if (broadcast.type === "court_petition") {
    embed.addFields(
      { name: "Petitioner", value: petition.petitionerName || "Unknown", inline: true },
      { name: "Discord ID", value: petition.petitionerDiscordId || "Not provided", inline: true },
      { name: "Request Type", value: petition.requestType || "legal question", inline: true },
      { name: "Status", value: petition.status || "pending", inline: true },
      { name: "Subject", value: petition.subject || broadcast.title || "Court petition", inline: false }
    );
    return embed;
  }

  if (broadcast.type === "court_sentencing") {
    embed.addFields(
      { name: "Defendant", value: courtCase.defendant || "Not entered", inline: true },
      { name: "Charge", value: Array.isArray(courtCase.charges) && courtCase.charges.length ? courtCase.charges.join("\n").slice(0, 1024) : "Not entered", inline: false },
      { name: "Verdict", value: courtCase.verdict || "Pending", inline: true },
      { name: "Sentence", value: courtCase.sentence || "Pending", inline: true },
      { name: "Judge", value: courtCase.judge || "Presiding Official", inline: true },
      { name: "Date", value: courtCase.hearingDate || new Date().toISOString().slice(0, 10), inline: true },
      { name: "Link to Judgment", value: linkedUrl || "Not available", inline: false }
    );
    return embed;
  }

  if (broadcast.type === "court_clemency") {
    embed.addFields(
      { name: "Person Receiving Clemency", value: clemency.person || courtCase.defendant || "Not entered", inline: true },
      { name: "Original Case", value: courtCase.caseId || courtCase.title || "Not entered", inline: true },
      { name: "Clemency Type", value: clemency.type || "pardon", inline: true },
      { name: "Issued By", value: clemency.issuedBy || broadcast.requestedBy || "Court authority", inline: true },
      { name: "Statement", value: (clemency.statement || description).slice(0, 1024), inline: false }
    );
    return embed;
  }

  embed.addFields(
    { name: "Case Name", value: courtCase.title || broadcast.title || "Supreme Court Matter", inline: true },
    { name: "Case ID", value: courtCase.caseId || broadcast.linkedId || "Not entered", inline: true },
    { name: "Status", value: courtCase.status || "Filed", inline: true },
    { name: "Presiding Judge", value: courtCase.judge || "Presiding Official", inline: true },
    { name: "Hearing Date", value: courtCase.hearingDate || "Pending", inline: true },
    { name: "Classification", value: courtCase.classification || broadcast.classification || "Judicial Notice", inline: true }
  );

  if (broadcast.metadata?.hearingAction) {
    embed.addFields({ name: "Hearing Action", value: broadcast.metadata.hearingAction, inline: true });
  }

  if (linkedUrl) {
    embed.addFields({ name: "Linked Case Page", value: linkedUrl, inline: false });
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
      .setLabel(isCourtBroadcast(broadcast) ? "Open Court Record" : "Read Full Article")
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
  const enrichedBroadcast = await enrichArticleBroadcast(broadcast);
  const channelIds = channelIdsForBroadcast(broadcast);

  if (!channelIds.length) {
    results.failures.push({ target: "channel", error: "No channel configured." });
    results.failureCount += 1;
    return;
  }

  for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.type === ChannelType.DM) {
      results.failures.push({ target: channelId, error: "Configured channel is not text-capable." });
      results.failureCount += 1;
      continue;
    }

    const sent = await channel.send({
      embeds: [buildBroadcastEmbed(enrichedBroadcast)],
      components: buildBroadcastComponents(enrichedBroadcast)
    });
    results.recipients.push({ target: channelId, method: "channel", messageId: sent.id });
    results.successCount += 1;
  }
}

async function sendBroadcastDm(userId, broadcast, results) {
  const enrichedBroadcast = await enrichArticleBroadcast(broadcast);
  const user = await client.users.fetch(userId).catch(() => null);

  if (!user || user.bot) {
    results.failures.push({ target: userId, error: "User not found or is a bot." });
    results.failureCount += 1;
    return;
  }

  try {
    await user.send({
      embeds: [buildBroadcastEmbed(enrichedBroadcast)],
      components: buildBroadcastComponents(enrichedBroadcast)
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
      ) ||
      isCourtBroadcast(broadcast)
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
let isProcessingEnemyRegistryEvents = false;

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

async function runEnemyRegistryLoop() {
  if (isProcessingEnemyRegistryEvents) {
    return;
  }

  isProcessingEnemyRegistryEvents = true;

  try {
    const events = await getPendingEnemyRegistryEvents();

    for (const event of events) {
      await processEnemyRegistryEvent(event);
    }
  } catch (error) {
    console.log(
      `Enemy registry Discord mirror error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    isProcessingEnemyRegistryEvents = false;
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
      .setName("petition")
      .setDescription("Submit a petition or appeal to the Supreme Court.")
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Type of petition.")
          .setRequired(true)
          .addChoices(
            { name: "Appeal", value: "appeal" },
            { name: "Pardon", value: "pardon" },
            { name: "Complaint", value: "complaint" },
            { name: "Dispute", value: "dispute" },
            { name: "Legal Question", value: "legal question" }
          )
      )
      .addStringOption((option) =>
        option.setName("subject").setDescription("Petition subject.").setRequired(true).setMaxLength(160)
      )
      .addStringOption((option) =>
        option.setName("statement").setDescription("Full petition statement.").setRequired(true).setMaxLength(3000)
      ),
    new SlashCommandBuilder()
      .setName("court")
      .setDescription("Post an active Supreme Court hearing notice.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Hearing action.")
          .setRequired(true)
          .addChoices(
            { name: "Start Hearing", value: "Start Hearing" },
            { name: "End Hearing", value: "End Hearing" },
            { name: "Post Court Statement", value: "Post Court Statement" },
            { name: "Summon Participant", value: "Summon Participant" },
            { name: "Record Evidence", value: "Record Evidence" },
            { name: "Announce Recess", value: "Announce Recess" }
          )
      )
      .addStringOption((option) =>
        option.setName("statement").setDescription("Notice text.").setRequired(true).setMaxLength(1500)
      ),
    new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Inspect a member profile.")
      .addUserOption((option) =>
        option.setName("user").setDescription("Member to inspect.").setRequired(true)
      ),
    new SlashCommandBuilder().setName("balance").setDescription("Show your Panem Credit balance."),
    new SlashCommandBuilder()
      .setName("pay")
      .setDescription("Send Panem Credits to another citizen.")
      .addUserOption((option) => option.setName("user").setDescription("Recipient.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Amount of Panem Credits.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName("transactions").setDescription("Show recent Panem Credit transactions."),
    new SlashCommandBuilder().setName("daily").setDescription("Claim the daily civic stipend."),
    new SlashCommandBuilder().setName("tax").setDescription("Show your tax status."),
    new SlashCommandBuilder().setName("market").setDescription("Show marketplace listings."),
    new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Buy district goods.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true))
      .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder()
      .setName("sell")
      .setDescription("List goods for sale.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true))
      .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity.").setRequired(true).setMinValue(1))
      .addNumberOption((option) => option.setName("price").setDescription("Unit price.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName("district").setDescription("Show your district economy status."),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Show the Panem Credit leaderboard."),
    new SlashCommandBuilder()
      .setName("grant")
      .setDescription("Issue Panem Credits to a user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Recipient.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Amount.").setRequired(true).setMinValue(1))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("fine")
      .setDescription("Fine a user in Panem Credits.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Citizen.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Amount.").setRequired(true).setMinValue(1))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("freeze-wallet")
      .setDescription("Freeze a user's Panem Credit wallet.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Citizen.").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("unfreeze-wallet")
      .setDescription("Unfreeze a user's Panem Credit wallet.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Citizen.").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("set-tax")
      .setDescription("Set a Panem Credit tax rate.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Tax type.")
          .setRequired(true)
          .addChoices(
            { name: "Income Tax", value: "income_tax" },
            { name: "Trade Tax", value: "trade_tax" },
            { name: "District Levy", value: "district_levy" },
            { name: "Emergency State Levy", value: "emergency_state_levy" },
            { name: "Luxury Goods Tax", value: "luxury_goods_tax" }
          )
      )
      .addNumberOption((option) => option.setName("rate").setDescription("Decimal rate, e.g. 0.05.").setRequired(true).setMinValue(0).setMaxValue(1)),
    new SlashCommandBuilder()
      .setName("run-tax")
      .setDescription("Run automatic income taxation.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("economy-report")
      .setDescription("Show a Ministry economy report.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
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

async function postActiveHearingCommand(message, action, text) {
  if (!activeHearingsChannelId) {
    await message.reply("ACTIVE_HEARINGS_CHANNEL_ID is not configured.");
    return;
  }

  const channel = await client.channels.fetch(activeHearingsChannelId).catch(() => null);

  if (!channel?.isTextBased() || channel.type === ChannelType.DM) {
    await message.reply("The active hearings channel is missing or not text-capable.");
    return;
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xc0c0c0)
        .setTitle("Supreme Court Notice")
        .setDescription(text || "Court proceeding update entered for the public record.")
        .addFields(
          { name: "Hearing Action", value: action, inline: true },
          { name: "Issued By", value: `<@${message.author.id}>`, inline: true }
        )
        .setThumbnail(absoluteWebsiteUrl("/wpu-grand-seal.png"))
        .setFooter({ text: "Supreme Court of the Wilford Panem Union" })
        .setTimestamp(new Date())
    ]
  });

  await message.reply("Court hearing notice posted.");
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
  runEnemyRegistryLoop();
  setInterval(runEnemyRegistryLoop, 15000);
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

    if (commandName === "petition") {
      const requestType = (parts.shift() || "legal question").toLowerCase();
      const subject = (parts.shift() || "Supreme Court Petition").replace(/_/g, " ");
      const statement = parts.join(" ").trim();

      if (!statement) {
        await message.reply("Use `-petition <appeal|pardon|complaint|dispute|legal_question> <subject> <statement>`.");
        return;
      }

      const petition = await submitCourtPetitionFromDiscord(message.author, {
        requestType: requestType.replace(/_/g, " "),
        subject,
        statement
      });
      await message.reply(`Supreme Court petition filed: ${petition.id}.`);
      return;
    }

    if (commandName === "court") {
      if (!hasCommandAccess(message, PermissionsBitField.Flags.ManageMessages)) {
        await message.reply("You need court staff access to post hearing notices.");
        return;
      }

      const action = (parts.shift() || "").replace(/_/g, " ");
      const statement = parts.join(" ").trim();
      const allowedActions = new Set([
        "start",
        "end",
        "statement",
        "summon",
        "evidence",
        "recess",
        "Start Hearing",
        "End Hearing",
        "Post Court Statement",
        "Summon Participant",
        "Record Evidence",
        "Announce Recess"
      ]);

      if (!allowedActions.has(action) || !statement) {
        await message.reply("Use `-court <start|end|statement|summon|evidence|recess> <notice>`.");
        return;
      }

      const labels = {
        start: "Start Hearing",
        end: "End Hearing",
        statement: "Post Court Statement",
        summon: "Summon Participant",
        evidence: "Record Evidence",
        recess: "Announce Recess"
      };
      await postActiveHearingCommand(message, labels[action] || action, statement);
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
    if (await handleEconomySlashCommand(interaction)) {
      return;
    }

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

    if (interaction.commandName === "petition") {
      await interaction.deferReply({ ephemeral: true });
      const petition = await submitCourtPetitionFromDiscord(interaction.user, {
        requestType: interaction.options.getString("type", true),
        subject: interaction.options.getString("subject", true),
        statement: interaction.options.getString("statement", true)
      });
      await interaction.editReply(`Supreme Court petition filed: ${petition.id}.`);
      return;
    }

    if (interaction.commandName === "court") {
      if (!hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ManageMessages)) {
        await interaction.reply({
          content: "You need court staff access to post hearing notices.",
          ephemeral: true
        });
        return;
      }

      const action = interaction.options.getString("action", true);
      const statement = interaction.options.getString("statement", true);
      const fakeMessage = {
        author: interaction.user,
        reply: (content) => interaction.editReply(content),
        channel: interaction.channel
      };
      await interaction.deferReply({ ephemeral: true });
      await postActiveHearingCommand(fakeMessage, action, statement);
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
