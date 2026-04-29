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
  ModalBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  Partials,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import {
  applicationQuestions,
  brand,
  economyCrimeDefaults,
  economyEventDefaults,
  economyGambleDefaults,
  economyJobDefaults,
  formatCredits,
  formatShortSha,
  gatheringActionDefaults,
  investmentFundDefaults,
  inventoryItemDefaults,
  inventoryRarityTiers,
  publicBotCommands,
  staffApplicationCommands,
  stockCompanyDefaults,
  stockMarketEventDefaults,
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
const marketplaceChannelId = String(process.env.PANEM_MARKETPLACE_CHANNEL_ID || process.env.DISCORD_MARKETPLACE_CHANNEL_ID || "").trim();
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

function linkedCitizenPromptEmbed() {
  return ministryEmbed(
    "Citizen Profile Not Linked",
    `Your Discord account is not linked to a WPU citizen profile.\nUse the buttons below to link your profile, apply for citizenship, or open the Citizen Portal.`
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

function randomEconomyAmount(min, max) {
  return Math.floor(Math.random() * (Number(max || min) - Number(min || 0) + 1)) + Number(min || 0);
}

function economyActiveEvent(economy) {
  const now = Date.now();
  return (economy.events || []).find((event) =>
    event.status === "active" && (!event.endsAt || Date.parse(event.endsAt) > now)
  ) || economyEventDefaults[0];
}

function economyCooldownReady(economy, walletId, type, key, hours) {
  const last = (economy.transactions || []).find((transaction) =>
    (transaction.fromWalletId === walletId || transaction.toWalletId === walletId) &&
    transaction.type === type &&
    transaction.meta?.key === key
  );
  return !last || Date.now() - Date.parse(last.createdAt || 0) >= Number(hours || 0) * 60 * 60 * 1000;
}

function addEconomyAlert(economy, alert) {
  economy.alerts = [
    {
      id: createId("economy-alert"),
      status: "open",
      createdAt: new Date().toISOString(),
      ...alert
    },
    ...(economy.alerts || [])
  ].slice(0, 300);
}

function ensureEconomyHoldings(wallet) {
  wallet.holdings = Array.isArray(wallet.holdings) ? wallet.holdings : [];
  wallet.watchlist = Array.isArray(wallet.watchlist) ? wallet.watchlist : [];
  wallet.favouriteDistricts = Array.isArray(wallet.favouriteDistricts) ? wallet.favouriteDistricts : [];
  wallet.marketAlerts = wallet.marketAlerts !== false;
  wallet.inventorySlots = Math.max(20, Number(wallet.inventorySlots || 40));
  wallet.inventoryFlags = Array.isArray(wallet.inventoryFlags) ? wallet.inventoryFlags : [];
  wallet.actionBans = Array.isArray(wallet.actionBans) ? wallet.actionBans : [];
  wallet.achievements = Array.isArray(wallet.achievements) ? wallet.achievements : [];
  wallet.collectionScore = Math.max(0, Number(wallet.collectionScore || 0));
}

function inventoryItemById(itemId, economy) {
  return (economy?.inventoryItems || inventoryItemDefaults).find((item) => item.id === itemId) ||
    (economy?.marketItems || []).find((item) => item.id === itemId) ||
    inventoryItemDefaults.find((item) => item.id === itemId);
}

function inventoryRarity(item) {
  return item?.rarity || (item?.restricted ? "rare" : "common");
}

function rarityMultiplierFor(rarity) {
  return inventoryRarityTiers.find((tier) => tier.id === rarity)?.multiplier || 1;
}

function inventoryItemValue(item, economy) {
  const market = (economy.marketItems || []).find((entry) => entry.id === item?.id);
  const base = Number(item?.baseValue || market?.currentPrice || market?.basePrice || item?.basePrice || 1);
  const district = (economy.districts || []).find((entry) => entry.name === (item?.district || market?.district));
  const pressure = district ? 1 + (Number(district.demandLevel || 70) - Number(district.supplyLevel || 70)) / 260 : 1;
  return Math.max(1, Math.round(base * rarityMultiplierFor(inventoryRarity(item)) * pressure));
}

function addEconomyHolding(wallet, itemId, quantity, unitPrice = 0) {
  ensureEconomyHoldings(wallet);
  const count = Math.max(1, Number(quantity || 1));
  let holding = wallet.holdings.find((entry) => entry.itemId === itemId);
  if (!holding) {
    holding = { itemId, quantity: 0, averageCost: 0, durability: 100, acquiredAt: new Date().toISOString(), acquisitionHistory: [] };
    wallet.holdings.push(holding);
  }
  const item = inventoryItemDefaults.find((entry) => entry.id === itemId);
  const previousQuantity = Number(holding.quantity || 0);
  const previousCost = previousQuantity * Number(holding.averageCost || 0);
  holding.quantity = previousQuantity + count;
  holding.averageCost = Math.round(((previousCost + count * Number(unitPrice || 0)) / holding.quantity) * 100) / 100;
  holding.rarity = inventoryRarity(item);
  holding.type = item?.type || item?.category || "goods";
  holding.durability = Math.min(100, Math.max(0, Number(holding.durability ?? item?.durability ?? 100)));
  holding.acquisitionHistory = [{ source: "discord", quantity: count, unitPrice: Number(unitPrice || 0), createdAt: new Date().toISOString() }, ...(holding.acquisitionHistory || [])].slice(0, 12);
}

function removeEconomyHolding(wallet, itemId, quantity) {
  ensureEconomyHoldings(wallet);
  const count = Math.max(1, Number(quantity || 1));
  const holding = wallet.holdings.find((entry) => entry.itemId === itemId);
  if (!holding || Number(holding.quantity || 0) < count) return false;
  holding.quantity -= count;
  wallet.holdings = wallet.holdings.filter((entry) => Number(entry.quantity || 0) > 0);
  return true;
}

function marketChangePercent(item) {
  const base = Number(item?.basePrice || item?.currentPrice || 1);
  return Math.round(((Number(item?.currentPrice || base) - base) / base) * 1000) / 10;
}

function occupiedInventorySlots(wallet) {
  ensureEconomyHoldings(wallet);
  return wallet.holdings.reduce((sum, holding) => sum + Math.max(0, Number(holding.quantity || 0)), 0);
}

function discordRollDrop(action) {
  const roll = Math.random();
  let cursor = 0;
  for (const drop of action.drops || []) {
    cursor += Number(drop.chance || 0);
    if (roll <= cursor) return drop;
  }
  return null;
}

function discordRollRisk(action) {
  return (action.riskEvents || []).find((risk) => Math.random() < Number(risk.chance || 0)) || null;
}

function removeRandomDiscordHolding(wallet) {
  ensureEconomyHoldings(wallet);
  const candidates = wallet.holdings.filter((holding) => Number(holding.quantity || 0) > 0);
  if (!candidates.length) return "";
  const holding = candidates[randomEconomyAmount(0, candidates.length - 1)];
  removeEconomyHolding(wallet, holding.itemId, 1);
  return holding.itemId;
}

function ensureStockCollections(wallet) {
  wallet.stockPortfolio = Array.isArray(wallet.stockPortfolio) ? wallet.stockPortfolio : [];
  wallet.stockWatchlist = Array.isArray(wallet.stockWatchlist) ? wallet.stockWatchlist : [];
  wallet.portfolioFrozen = Boolean(wallet.portfolioFrozen);
}

function findStockCompany(economy, ticker) {
  return (economy.stockCompanies || stockCompanyDefaults).find((company) => company.ticker.toLowerCase() === String(ticker || "").toLowerCase());
}

function getDiscordStockPosition(wallet, ticker) {
  ensureStockCollections(wallet);
  let position = wallet.stockPortfolio.find((entry) => entry.ticker === ticker);
  if (!position) {
    position = { ticker, shares: 0, averagePrice: 0, dividendsEarned: 0 };
    wallet.stockPortfolio.push(position);
  }
  return position;
}

function discordStockPortfolioValue(wallet, economy) {
  ensureStockCollections(wallet);
  return wallet.stockPortfolio.reduce((sum, position) => {
    const company = findStockCompany(economy, position.ticker);
    return sum + Number(position.shares || 0) * Number(company?.sharePrice || 0);
  }, 0);
}

function discordMoveStock(company, direction = 0) {
  const previous = Number(company.sharePrice || 1);
  company.sharePrice = Math.max(1, Math.round(previous * (1 + direction) * 100) / 100);
  company.dailyChangePercent = Math.round(((company.sharePrice - previous) / previous) * 1000) / 10;
  company.priceHistory = [...(company.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }].slice(-30);
}

async function resolveMarketplaceChannel() {
  if (marketplaceChannelId) {
    try {
      return await client.channels.fetch(marketplaceChannelId);
    } catch {}
  }
  const guildId = broadcastGuildId || applicationGuildId;
  if (!guildId) return null;
  try {
    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    return channels.find((channel) => channel?.name === "panem-marketplace" && channel?.isTextBased?.()) || null;
  } catch {
    return null;
  }
}

async function postMarketNotice(title, description) {
  const channel = await resolveMarketplaceChannel();
  if (!channel?.isTextBased?.()) return;
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xd7a85f)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: "Panem Marketplace • Ministry of Credit & Records" })
        .setTimestamp(new Date())
    ]
  });
}

async function postMssFinancialAlert(alert) {
  const channelId = mssChannelId || announcementChannelId;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased?.()) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b1111)
            .setTitle("MSS Financial Crime Alert")
            .setDescription(alert.summary || "Suspicious Panem Credit activity detected.")
            .addFields(
              { name: "Severity", value: String(alert.severity || "high"), inline: true },
              { name: "Action", value: String(alert.action || "Investigate"), inline: true }
            )
            .setFooter({ text: "Ministry of State Security • Financial Crimes Desk" })
            .setTimestamp(new Date())
        ]
      });
    }
  } catch (error) {
    console.warn(`Unable to post MSS financial alert: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function markDiscordWanted(economy, targetWallet, amount, reason, actor) {
  targetWallet.wanted = true;
  targetWallet.underReview = true;
  targetWallet.bounty = Math.max(Number(targetWallet.bounty || 0), Number(amount || 250));
  targetWallet.taxStatus = "MSS watchlist";
  addEconomyAlert(economy, {
    severity: "critical",
    type: "wanted_financier",
    walletId: targetWallet.id,
    bounty: targetWallet.bounty,
    summary: `${targetWallet.displayName} marked wanted. ${reason}`,
    action: "bounty posted"
  });
  pushEconomyTransaction(economy, { fromWalletId: targetWallet.id, toWalletId: "mss", amount: 0, type: "wanted", reason, createdBy: actor });
}

const economyHelpFooter = "Use /help-economy for commands • Open the website for full dashboards";

function iconForTitle(title = "") {
  const value = title.toLowerCase();
  if (value.includes("stock") || value.includes("pse") || value.includes("dividend")) return "📈";
  if (value.includes("market") || value.includes("listing") || value.includes("price")) return "🏪";
  if (value.includes("inventory") || value.includes("crate") || value.includes("item")) return "🎒";
  if (value.includes("fish")) return "🎣";
  if (value.includes("mine") || value.includes("mining")) return "⛏";
  if (value.includes("farm") || value.includes("harvest")) return "🌾";
  if (value.includes("mss") || value.includes("alert") || value.includes("wanted")) return "🚨";
  if (value.includes("tax")) return "📜";
  if (value.includes("grant") || value.includes("government") || value.includes("wallet status")) return "🏛";
  if (value.includes("payment") || value.includes("transfer")) return "🪙";
  if (value.includes("balance") || value.includes("wallet")) return "💳";
  return "🏛";
}

function ministryEmbed(title, description, fields = []) {
  const icon = iconForTitle(title);
  return new EmbedBuilder()
    .setColor(0xd7a85f)
    .setAuthor({ name: "Ministry of Credit & Records" })
    .setTitle(`${icon} ${title}`)
    .setDescription(description)
    .addFields(fields)
    .setFooter({ text: economyHelpFooter })
    .setTimestamp(new Date());
}

function linkButton(label, url, emoji) {
  return new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel(label)
    .setURL(url)
    .setEmoji(emoji);
}

function economyQuickLinks(...keys) {
  const links = {
    transactions: linkButton("Transactions", `${websiteUrl}/panem-credit`, "📜"),
    marketplace: linkButton("Marketplace", `${websiteUrl}/marketplace`, "🏪"),
    inventory: linkButton("Inventory", `${websiteUrl}/inventory`, "🎒"),
    stocks: linkButton("Stocks", `${websiteUrl}/stock-market`, "📈"),
    portal: linkButton("Citizen Portal", `${websiteUrl}/citizen-portal`, "🛂")
  };
  const buttons = keys.map((key) => links[key]).filter(Boolean).slice(0, 5);
  return buttons.length ? [new ActionRowBuilder().addComponents(...buttons)] : [];
}

function helpEmbed(title, lines) {
  return ministryEmbed(title, lines.join("\n"));
}

function dashboardSelect(section = "overview") {
  const options = [
    ["overview", "Overview", "Balance, status, inventory, stocks, and requests", "🏛"],
    ["wallet", "Wallet", "Panem Credit wallet details", "💳"],
    ["transactions", "Transactions", "Recent ledger activity", "🪙"],
    ["marketplace", "Marketplace", "Listings and goods exchange", "🏪"],
    ["inventory", "Inventory", "Items, rarity, and value", "🎒"],
    ["stocks", "Stocks", "PSE portfolio and market", "📈"],
    ["taxes", "Taxes", "Tax status and records", "📜"],
    ["district", "District", "District production profile", "🌍"],
    ["requests", "Requests", "Citizen requests and case files", "🏛"],
    ["union-id", "Union ID", "Identity and verification", "🛂"],
    ["help", "Help", "Beginner next steps", "❔"]
  ];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("citizen-dashboard:section")
      .setPlaceholder("Choose a section")
      .addOptions(options.map(([value, label, description, emoji]) => ({
        label,
        value,
        description,
        emoji,
        default: value === section
      })))
  );
}

function dashboardButtons(section = "overview") {
  const rows = [];
  const openSite = new ButtonBuilder().setCustomId("citizen-dashboard:open-site").setLabel("Open Website").setEmoji("🌐").setStyle(ButtonStyle.Secondary);
  const linkProfile = new ButtonBuilder().setCustomId("citizen-dashboard:link-profile").setLabel("Link Citizen Profile").setEmoji("🛂").setStyle(ButtonStyle.Primary);
  const apply = linkButton("Apply", `${websiteUrl}/citizenship`, "🛂");
  if (section === "unlinked") return [new ActionRowBuilder().addComponents(linkProfile, apply, linkButton("Citizen Portal", `${websiteUrl}/citizen-portal`, "🌐"))];
  if (section === "wallet") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:send-credits").setLabel("Send Credits").setEmoji("🪙").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("citizen-dashboard:transactions").setLabel("View Transactions").setEmoji("📜").setStyle(ButtonStyle.Secondary), openSite));
  else if (section === "inventory") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:view-items").setLabel("View Items").setEmoji("🎒").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("citizen-dashboard:sell-item").setLabel("Sell/List Item").setEmoji("🏷").setStyle(ButtonStyle.Primary), openSite));
  else if (section === "marketplace") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:browse-listings").setLabel("Browse Listings").setEmoji("🏪").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("citizen-dashboard:buy-item").setLabel("Buy Item").setEmoji("🛒").setStyle(ButtonStyle.Primary), openSite));
  else if (section === "stocks") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:stock-buy").setLabel("Buy Stock").setEmoji("📈").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("citizen-dashboard:stock-sell").setLabel("Sell Stock").setEmoji("📉").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("citizen-dashboard:market-news").setLabel("Market News").setEmoji("📰").setStyle(ButtonStyle.Secondary)));
  else if (section === "requests") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:submit-request").setLabel("Submit Request").setEmoji("🏛").setStyle(ButtonStyle.Primary), openSite));
  else if (section === "union-id") rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("citizen-dashboard:verify-code").setLabel("Verify Code").setEmoji("🛂").setStyle(ButtonStyle.Primary), openSite));
  else rows.push(new ActionRowBuilder().addComponents(openSite, new ButtonBuilder().setCustomId("citizen-dashboard:transactions").setLabel("Transactions").setEmoji("📜").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("citizen-dashboard:view-items").setLabel("Inventory").setEmoji("🎒").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("citizen-dashboard:market-news").setLabel("Stocks").setEmoji("📈").setStyle(ButtonStyle.Secondary)));
  return rows;
}

function dashboardComponents(section = "overview") {
  return [dashboardSelect(section), ...dashboardButtons(section)];
}

function itemDisplayName(itemId, economy) {
  const item = inventoryItemById(itemId, economy) || (economy.marketItems || []).find((entry) => entry.id === itemId);
  return item?.name || itemId;
}

function dashboardMetricSummary(economy, governmentStore, identity) {
  const wallet = identity.wallet;
  ensureEconomyHoldings(wallet);
  ensureStockCollections(wallet);
  const requests = (governmentStore.citizenRequests || []).filter((request) => request.citizenId === identity.citizen.id);
  const activeRequests = requests.filter((request) => !["Completed", "Rejected"].includes(request.status));
  const inventoryValue = wallet.holdings.reduce((sum, holding) => sum + inventoryItemValue(inventoryItemById(holding.itemId, economy), economy) * Number(holding.quantity || 0), 0);
  const stockValue = discordStockPortfolioValue(wallet, economy);
  const listingsCount = (economy.listings || []).filter((listing) => listing.sellerWalletId === wallet.id && listing.status === "active").length;
  const taxPaid = (economy.taxRecords || []).filter((record) => record.walletId === wallet.id && record.status === "paid").reduce((sum, record) => sum + Number(record.amount || 0), 0);
  return { requests, activeRequests, inventoryValue, stockValue, listingsCount, taxPaid };
}

async function getCitizenDashboardContext(user) {
  const [economy, governmentStore] = await Promise.all([readEconomyStore(), readGovernmentAccessStore()]);
  const identity = getVerifiedDiscordCitizen(governmentStore, economy, user);
  return { economy, governmentStore, identity };
}

function citizenDashboardEmbed(section, context, user) {
  const { economy, governmentStore, identity } = context;
  if (!identity) return linkedCitizenPromptEmbed();
  if (!identity.wallet) return walletLinkRequiredEmbed();
  const { citizen, wallet } = identity;
  const metrics = dashboardMetricSummary(economy, governmentStore, identity);
  const district = (economy.districts || []).find((entry) => entry.name === wallet.district || entry.name === citizen.district);
  const title = {
    overview: "Citizen Dashboard",
    wallet: "Wallet",
    transactions: "Transactions",
    marketplace: "Marketplace",
    inventory: "Inventory",
    stocks: "Stocks",
    taxes: "Taxes",
    district: "District",
    requests: "Requests",
    "union-id": "Union ID",
    help: "Citizen Help"
  }[section] || "Citizen Dashboard";
  let description = `${citizen.citizenName || citizen.name || wallet.displayName || "Registered Citizen"}\n${citizen.district || wallet.district || "Unassigned"}\n`;
  const fields = [];
  if (section === "wallet" || section === "overview") {
    fields.push({ name: "💳 Balance", value: formatCredits(wallet.balance), inline: true }, { name: "Status", value: String(wallet.status || "active"), inline: true }, { name: "Tax", value: String(wallet.taxStatus || "compliant"), inline: true });
  }
  if (section === "overview") {
    fields.push({ name: "🎒 Inventory", value: `${wallet.holdings.length} types\n${formatCredits(metrics.inventoryValue)}`, inline: true }, { name: "📈 Stocks", value: `${wallet.stockPortfolio.length} positions\n${formatCredits(metrics.stockValue)}`, inline: true }, { name: "🏪 Listings", value: String(metrics.listingsCount), inline: true }, { name: "🏛 Requests", value: `${metrics.activeRequests.length} active`, inline: true }, { name: "🛂 Union ID", value: `${citizen.unionSecurityId}\n${citizen.verificationStatus}`, inline: true }, { name: "🚨 MSS Status", value: wallet.wanted ? "Wanted" : wallet.underReview ? "Under review" : "Clear", inline: true });
  } else if (section === "transactions") {
    const rows = (economy.transactions || []).filter((txn) => txn.fromWalletId === wallet.id || txn.toWalletId === wallet.id).slice(0, 8).map((txn) => `${txn.type}: ${formatCredits(txn.amount)} - ${txn.reason}`).join("\n") || "No recent transactions.";
    description += rows;
  } else if (section === "marketplace") {
    const listings = (economy.listings || []).filter((listing) => listing.status === "active").slice(0, 6).map((listing) => `${itemDisplayName(listing.itemId, economy)} x${listing.quantity} - ${formatCredits(listing.price)}`).join("\n") || "No active listings.";
    description += `Your active listings: ${metrics.listingsCount}\n\n${listings}`;
  } else if (section === "inventory") {
    const rows = wallet.holdings.slice(0, 8).map((holding) => `${itemDisplayName(holding.itemId, economy)} x${holding.quantity} (${holding.rarity || "common"})`).join("\n") || "Your inventory is empty. Try fishing, mining, or farming.";
    description += `Worth: ${formatCredits(metrics.inventoryValue)}\nSlots: ${occupiedInventorySlots(wallet)} / ${wallet.inventorySlots}\n\n${rows}`;
  } else if (section === "stocks") {
    const rows = wallet.stockPortfolio.slice(0, 8).map((position) => {
      const company = findStockCompany(economy, position.ticker);
      return `${position.ticker}: ${position.shares} shares - ${formatCredits(Number(position.shares || 0) * Number(company?.sharePrice || 0))}`;
    }).join("\n") || "You do not own shares yet. Visit the Panem Stock Exchange.";
    description += `Portfolio value: ${formatCredits(metrics.stockValue)}\n\n${rows}`;
  } else if (section === "taxes") {
    const rows = (economy.taxRecords || []).filter((record) => record.walletId === wallet.id).slice(0, 8).map((record) => `${taxLabel(record.taxType)}: ${formatCredits(record.amount)} (${record.status})`).join("\n") || "No tax records.";
    description += `Status: ${wallet.taxStatus}\nPaid total: ${formatCredits(metrics.taxPaid)}\n\n${rows}`;
  } else if (section === "district") {
    description += `${district?.name || citizen.district || "Unassigned"}\n${district?.goodsProduced || "No district production data."}\nSupply ${district?.supplyLevel || 0} / Demand ${district?.demandLevel || 0} / Prosperity ${district?.prosperityRating || 0}`;
  } else if (section === "requests") {
    const rows = metrics.requests.slice(0, 8).map((request) => `${request.category}: ${request.status} (${request.priority})`).join("\n") || "No citizen requests recorded.";
    description += `Active requests: ${metrics.activeRequests.length}\n\n${rows}`;
  } else if (section === "union-id") {
    description += `Union Security ID: ${citizen.unionSecurityId}\nVerification: ${citizen.verificationStatus}\nSecurity: ${citizen.securityClassification}\nCitizen status: ${citizen.citizenStatus}`;
  } else if (section === "help") {
    description += "Start with /daily for credits, /market for goods, /inventory for items, and /stocks for PSE shares. Use the dropdown to view each section.";
  }
  return ministryEmbed(title, description, fields).setAuthor({ name: `Wilford Panem Union • ${user.username}` }).setFooter({ text: "Wilford Panem Union • Citizen Services Network" });
}

async function replyCitizenDashboard(interaction, section = "overview", update = false) {
  const context = await getCitizenDashboardContext(interaction.user);
  const embed = citizenDashboardEmbed(section, context, interaction.user);
  const components = context.identity?.wallet ? dashboardComponents(section) : dashboardButtons("unlinked");
  if (update && interaction.isMessageComponent()) return interaction.update({ embeds: [embed], components });
  const payload = { embeds: [embed], components, ephemeral: true };
  return interaction.reply(payload);
}

async function writeGovernmentAccessStore(store) {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required for citizen registry writes.");
  }
  const response = await fetch(`${apiUrl}/api/admin/government-access-store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": adminApiKey },
    body: JSON.stringify(store),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Citizen registry write failed (${response.status}).`);
  }
  return response.json();
}

async function updateCitizenDashboardAfterModal(interaction, section, message) {
  const context = await getCitizenDashboardContext(interaction.user);
  await interaction.reply({
    embeds: [ministryEmbed("Dashboard Updated", message)],
    ephemeral: true
  });
  return context;
}

function shortModalInput(id, label, placeholder, required = true) {
  return new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setStyle(TextInputStyle.Short);
}

function paragraphModalInput(id, label, placeholder, required = true) {
  return new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setStyle(TextInputStyle.Paragraph);
}

function dashboardModal(customId, title, inputs) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(...inputs.map((input) => new ActionRowBuilder().addComponents(input)));
}

function modalValue(interaction, id) {
  return String(interaction.fields.getTextInputValue(id) || "").trim();
}

function parsePositiveIntInput(value) {
  const parsed = Number.parseInt(String(value || "").replace(/,/g, ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parsePositiveNumberInput(value) {
  const parsed = Number.parseFloat(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function findCitizenForDashboardTransfer(governmentStore, economy, input) {
  const needle = String(input || "").trim().replace(/[<@!>]/g, "").toLowerCase();
  if (!needle) return null;
  const citizen = (governmentStore.citizenRecords || []).find((record) =>
    String(record.unionSecurityId || "").toLowerCase() === needle ||
    String(record.discordId || "").toLowerCase() === needle ||
    String(record.citizenName || "").toLowerCase() === needle
  );
  if (!citizen) return null;
  const wallet = getEconomyWallet(economy, citizen.id) || getEconomyWallet(economy, citizen.discordId);
  return wallet ? { citizen, wallet } : null;
}

function dashboardReplyEmbed(title, message) {
  return ministryEmbed(title, message).setFooter({ text: "Wilford Panem Union • Citizen Services Network" });
}

async function handleCitizenDashboardComponent(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === "citizen-dashboard:section") {
    await replyCitizenDashboard(interaction, interaction.values[0] || "overview", true);
    return true;
  }

  if (!interaction.isButton() || !interaction.customId.startsWith("citizen-dashboard:")) {
    return false;
  }

  const action = interaction.customId.split(":")[1];
  const sectionMap = {
    transactions: "transactions",
    "view-items": "inventory",
    "browse-listings": "marketplace",
    "market-news": "stocks"
  };

  if (sectionMap[action]) {
    await replyCitizenDashboard(interaction, sectionMap[action], true);
    return true;
  }

  if (action === "open-site") {
    await interaction.reply({
      embeds: [dashboardReplyEmbed("Citizen Portal Links", "Open the WPU website for the full citizen portal, marketplace, inventory, and Panem Stock Exchange.")],
      components: economyQuickLinks(),
      ephemeral: true
    });
    return true;
  }

  if (action === "link-profile" || action === "verify-code") {
    await interaction.showModal(dashboardModal("citizen-modal:link-profile", "Link Citizen Profile", [
      shortModalInput("unionSecurityId", "Union Security ID", "WPU-0000-0000"),
      shortModalInput("verificationCode", "Verification Code", "ABC123")
    ]));
    return true;
  }

  if (action === "send-credits") {
    await interaction.showModal(dashboardModal("citizen-modal:send-credits", "Send Panem Credits", [
      shortModalInput("recipient", "Recipient", "Union Security ID, Discord ID, or citizen name"),
      shortModalInput("amount", "Amount", "50"),
      shortModalInput("note", "Note", "Civic payment", false)
    ]));
    return true;
  }

  if (action === "sell-item") {
    await interaction.showModal(dashboardModal("citizen-modal:sell-item", "Sell or List Item", [
      shortModalInput("item", "Item", "coal"),
      shortModalInput("quantity", "Quantity", "1"),
      shortModalInput("price", "Listing Price Optional", "Leave blank to sell to the state", false)
    ]));
    return true;
  }

  if (action === "buy-item") {
    await interaction.showModal(dashboardModal("citizen-modal:buy-item", "Buy Marketplace Item", [
      shortModalInput("item", "Item", "fish"),
      shortModalInput("quantity", "Quantity", "1")
    ]));
    return true;
  }

  if (action === "stock-buy" || action === "stock-sell") {
    await interaction.showModal(dashboardModal(`citizen-modal:${action}`, action === "stock-buy" ? "Buy Stock" : "Sell Stock", [
      shortModalInput("ticker", "Ticker", "LBE"),
      shortModalInput("shares", "Shares", "1")
    ]));
    return true;
  }

  if (action === "submit-request") {
    await interaction.showModal(dashboardModal("citizen-modal:request", "Submit Government Request", [
      shortModalInput("category", "Category", "Economy, Union ID, District, General"),
      paragraphModalInput("message", "Message", "Describe what citizen services should review.")
    ]));
    return true;
  }

  await interaction.reply({ embeds: [dashboardReplyEmbed("Dashboard Action", "That dashboard action is not available yet.")], ephemeral: true });
  return true;
}

async function handleCitizenDashboardModal(interaction) {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith("citizen-modal:")) {
    return false;
  }

  const action = interaction.customId.split(":")[1];
  const economy = await readEconomyStore();
  const governmentStore = await readGovernmentAccessStore();

  if (action === "link-profile") {
    const unionSecurityId = modalValue(interaction, "unionSecurityId");
    const verificationCode = modalValue(interaction, "verificationCode");
    const citizen = (governmentStore.citizenRecords || []).find((record) =>
      String(record.unionSecurityId || "").trim().toLowerCase() === unionSecurityId.toLowerCase() &&
      String(record.verificationCode || "").trim().toLowerCase() === verificationCode.toLowerCase()
    );
    if (!citizen || citizen.verificationStatus !== "Verified" || citizen.lostOrStolen) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Link Failed", "That Union Security ID and verification code could not be matched to an active verified citizen profile.")], ephemeral: true });
      return true;
    }
    citizen.discordId = interaction.user.id;
    citizen.discordTag = interaction.user.tag || interaction.user.username;
    citizen.updatedAt = new Date().toISOString();
    const wallet = getEconomyWallet(economy, citizen.walletId || citizen.userId || citizen.discordId || citizen.id);
    if (wallet) {
      wallet.discordId = interaction.user.id;
      wallet.displayName = citizen.citizenName || wallet.displayName;
      wallet.updatedAt = citizen.updatedAt;
    }
    await Promise.all([writeGovernmentAccessStore(governmentStore), writeEconomyStore(economy)]);
    await interaction.reply({ embeds: [dashboardReplyEmbed("Citizen Profile Linked", "Your Discord account is now linked to your WPU citizen profile. Use `/citizen-dashboard` to open your synced dashboard.")], ephemeral: true });
    return true;
  }

  const identity = getVerifiedDiscordCitizen(governmentStore, economy, interaction.user);
  if (!identity?.wallet) {
    await interaction.reply({ embeds: [linkedCitizenPromptEmbed()], components: dashboardButtons("unlinked"), ephemeral: true });
    return true;
  }

  const { citizen, wallet } = identity;
  const now = new Date().toISOString();

  if (action === "send-credits") {
    const amount = parsePositiveNumberInput(modalValue(interaction, "amount"));
    const recipient = findCitizenForDashboardTransfer(governmentStore, economy, modalValue(interaction, "recipient"));
    const note = modalValue(interaction, "note") || "Discord dashboard transfer";
    if (!recipient || !amount) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Transfer Needs Details", "Enter a valid recipient and amount, for example recipient `WPU-0000-0000` and amount `50`.")], ephemeral: true });
      return true;
    }
    const taxRate = Number(economy.taxRates?.trade_tax || 0);
    const taxAmount = Math.round(amount * taxRate * 100) / 100;
    const total = amount + taxAmount;
    if (total >= 5000) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Confirmation Required", `This transfer totals ${formatCredits(total)}. Use \`/pay\` with confirmation for large transfers.`)], ephemeral: true });
      return true;
    }
    if (wallet.status !== "active" || recipient.wallet.status !== "active" || Number(wallet.balance || 0) < total) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Transfer Blocked", "A wallet restriction or insufficient balance prevents this transfer.")], ephemeral: true });
      return true;
    }
    wallet.balance -= total;
    recipient.wallet.balance = Number(recipient.wallet.balance || 0) + amount;
    wallet.updatedAt = now;
    recipient.wallet.updatedAt = now;
    pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: recipient.wallet.id, amount, type: "transfer", reason: note, taxAmount, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await interaction.reply({ embeds: [dashboardReplyEmbed("Transfer Complete", `${formatCredits(amount)} sent to ${recipient.citizen.citizenName || recipient.wallet.displayName}. Tax: ${formatCredits(taxAmount)}.`)], components: dashboardComponents("wallet"), ephemeral: true });
    return true;
  }

  if (action === "sell-item") {
    const itemInput = modalValue(interaction, "item");
    const quantity = parsePositiveIntInput(modalValue(interaction, "quantity"));
    const price = parsePositiveNumberInput(modalValue(interaction, "price"));
    const item = (economy.inventoryItems || inventoryItemDefaults).find((entry) => entry.id === itemInput || String(entry.name || "").toLowerCase() === itemInput.toLowerCase()) ||
      (economy.marketItems || []).find((entry) => entry.id === itemInput || String(entry.name || "").toLowerCase() === itemInput.toLowerCase());
    if (!item || !quantity || wallet.status !== "active" || !removeEconomyHolding(wallet, item.id, quantity)) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Item Action Blocked", "That item could not be found in your inventory. Try the Inventory section first.")], ephemeral: true });
      return true;
    }
    if (["rare", "epic", "legendary"].includes(inventoryRarity(item))) {
      addEconomyHolding(wallet, item.id, quantity, inventoryItemValue(item, economy));
      await interaction.reply({ embeds: [dashboardReplyEmbed("Confirmation Required", `${item.name} is ${inventoryRarity(item)}. Use \`/sell\` or \`/list\` with confirmation to sell rare items.`)], ephemeral: true });
      return true;
    }
    if (price) {
      economy.listings = [{ id: createId("listing"), sellerWalletId: wallet.id, itemId: item.id, quantity, price, status: "active", createdAt: now }, ...(economy.listings || [])];
      pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "market-listings", amount: quantity * price, type: "listing_created", reason: `${quantity} x ${item.name}`, createdBy: interaction.user.id, meta: { key: item.id } });
      await writeEconomyStore(economy);
      await interaction.reply({ embeds: [dashboardReplyEmbed("Marketplace Listing Created", `${quantity} x ${item.name} listed at ${formatCredits(price)} each.`)], components: dashboardComponents("marketplace"), ephemeral: true });
      return true;
    }
    const value = inventoryItemValue(item, economy) * quantity;
    wallet.balance += value;
    wallet.updatedAt = now;
    pushEconomyTransaction(economy, { fromWalletId: "state-procurement", toWalletId: wallet.id, amount: value, type: "inventory_sell", reason: `${quantity} x ${item.name}`, createdBy: interaction.user.id, meta: { key: item.id, quantity } });
    await writeEconomyStore(economy);
    await interaction.reply({ embeds: [dashboardReplyEmbed("State Purchase Recorded", `${quantity} x ${item.name} sold for ${formatCredits(value)}.`)], components: dashboardComponents("inventory"), ephemeral: true });
    return true;
  }

  if (action === "buy-item") {
    const itemInput = modalValue(interaction, "item");
    const quantity = parsePositiveIntInput(modalValue(interaction, "quantity"));
    const item = (economy.marketItems || []).find((entry) => entry.id === itemInput || String(entry.name || "").toLowerCase() === itemInput.toLowerCase());
    if (!item || !quantity || Number(item.stock || 0) < quantity || wallet.status !== "active") {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Purchase Rejected", "That marketplace good is unavailable, out of stock, or your wallet is restricted.")], ephemeral: true });
      return true;
    }
    const subtotal = Number(item.currentPrice || item.basePrice || 0) * quantity;
    const taxType = item.category === "Luxury Goods" ? "luxury_goods_tax" : "trade_tax";
    const taxAmount = Math.round(subtotal * Number(economy.taxRates?.[taxType] || 0) * 100) / 100;
    if (Number(wallet.balance || 0) < subtotal + taxAmount) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("Purchase Rejected", `You need ${formatCredits(subtotal + taxAmount)} for this order.`)], ephemeral: true });
      return true;
    }
    wallet.balance -= subtotal + taxAmount;
    wallet.updatedAt = now;
    item.stock -= quantity;
    addEconomyHolding(wallet, item.id, quantity, Number(item.currentPrice || item.basePrice || 0));
    pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "market", amount: subtotal, type: "market_buy", reason: `${quantity} x ${item.name}`, taxAmount, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await interaction.reply({ embeds: [dashboardReplyEmbed("Purchase Approved", `${quantity} x ${item.name} purchased for ${formatCredits(subtotal + taxAmount)}.`)], components: dashboardComponents("marketplace"), ephemeral: true });
    return true;
  }

  if (action === "stock-buy" || action === "stock-sell") {
    const company = findStockCompany(economy, modalValue(interaction, "ticker"));
    const shares = parsePositiveIntInput(modalValue(interaction, "shares"));
    ensureStockCollections(wallet);
    if (!company || company.status !== "active" || wallet.status !== "active" || wallet.portfolioFrozen || !shares) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("PSE Trade Rejected", "Ticker, trading status, wallet restrictions, or share amount prevented this trade.")], ephemeral: true });
      return true;
    }
    const taxRate = Number(economy.stockSettings?.transactionTax || 0.015);
    const fee = Number(economy.stockSettings?.transactionFee || 2);
    const position = getDiscordStockPosition(wallet, company.ticker);
    const subtotal = Math.round(Number(company.sharePrice || 0) * shares * 100) / 100;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    if (action === "stock-buy") {
      const total = subtotal + tax + fee;
      if (total >= 5000) {
        await interaction.reply({ embeds: [dashboardReplyEmbed("Confirmation Required", `This stock order costs ${formatCredits(total)}. Use \`/buy-stock\` with confirmation for large orders.`)], ephemeral: true });
        return true;
      }
      if (Number(wallet.balance || 0) < total) {
        await interaction.reply({ embeds: [dashboardReplyEmbed("PSE Trade Rejected", `You need ${formatCredits(total)} for this order.`)], ephemeral: true });
        return true;
      }
      discordMoveStock(company, Math.min(0.018, shares / 10000));
      const previousShares = Number(position.shares || 0);
      const previousCost = previousShares * Number(position.averagePrice || 0);
      position.shares = previousShares + shares;
      position.averagePrice = Math.round(((previousCost + subtotal) / position.shares) * 100) / 100;
      wallet.balance -= total;
      economy.stockTrades = [{ id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "buy", shares, price: company.sharePrice, subtotal, tax, fee, createdAt: now, createdBy: interaction.user.id }, ...(economy.stockTrades || [])].slice(0, 1000);
      pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "pse", amount: total, type: "stock_buy", reason: `${shares} ${company.ticker} shares`, taxAmount: tax, createdBy: interaction.user.id, meta: { key: company.ticker } });
      await writeEconomyStore(economy);
      await interaction.reply({ embeds: [dashboardReplyEmbed("PSE Buy Order Filled", `${shares} ${company.ticker} shares purchased for ${formatCredits(total)}.`)], components: dashboardComponents("stocks"), ephemeral: true });
      return true;
    }
    if (Number(position.shares || 0) < shares) {
      await interaction.reply({ embeds: [dashboardReplyEmbed("PSE Trade Rejected", "You do not hold enough shares.")], ephemeral: true });
      return true;
    }
    discordMoveStock(company, -Math.min(0.018, shares / 10000));
    const proceeds = Math.max(0, subtotal - tax - fee);
    position.shares -= shares;
    wallet.stockPortfolio = wallet.stockPortfolio.filter((entry) => Number(entry.shares || 0) > 0);
    wallet.balance += proceeds;
    economy.stockTrades = [{ id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "sell", shares, price: company.sharePrice, subtotal, tax, fee, createdAt: now, createdBy: interaction.user.id }, ...(economy.stockTrades || [])].slice(0, 1000);
    pushEconomyTransaction(economy, { fromWalletId: "pse", toWalletId: wallet.id, amount: proceeds, type: "stock_sell", reason: `${shares} ${company.ticker} shares`, taxAmount: tax, createdBy: interaction.user.id, meta: { key: company.ticker } });
    await writeEconomyStore(economy);
    await interaction.reply({ embeds: [dashboardReplyEmbed("PSE Sell Order Filled", `${shares} ${company.ticker} shares sold for ${formatCredits(proceeds)}.`)], components: dashboardComponents("stocks"), ephemeral: true });
    return true;
  }

  if (action === "request") {
    const request = {
      id: createId("request"),
      citizenId: citizen.id,
      citizenName: citizen.citizenName,
      district: citizen.district || wallet.district || "",
      category: modalValue(interaction, "category") || "General",
      priority: "Normal",
      message: modalValue(interaction, "message"),
      attachments: "Submitted from Discord citizen dashboard.",
      status: "Submitted",
      assignedMinistry: "Citizen Services",
      governmentNotes: "",
      citizenResponse: "",
      escalation: "",
      createdAt: now,
      updatedAt: now
    };
    governmentStore.citizenRequests = [request, ...(governmentStore.citizenRequests || [])];
    await writeGovernmentAccessStore(governmentStore);
    await interaction.reply({ embeds: [dashboardReplyEmbed("Request Submitted", `Citizen Services request ${request.id} has been filed and will appear in the website portal.`)], components: dashboardComponents("requests"), ephemeral: true });
    return true;
  }

  await interaction.reply({ embeds: [dashboardReplyEmbed("Dashboard Action", "That dashboard submission could not be processed.")], ephemeral: true });
  return true;
}

function requireEconomyAdmin(interaction) {
  return hasSlashCommandAccess(interaction, PermissionsBitField.Flags.ManageGuild);
}

async function replyEconomy(interaction, embed, ephemeral = false, components = []) {
  await interaction.reply({ embeds: [embed], components, ephemeral });
}

async function handleEconomySlashCommand(interaction) {
  const name = interaction.commandName;
  const helpCommands = new Set(["help-economy", "help-market", "help-inventory", "help-stocks", "help-citizen", "help-mss"]);
  const citizenEconomyCommands = new Set([
    "balance",
    "citizen-dashboard",
    "pay",
    "transactions",
    "daily",
    "work",
    "overtime",
    "crime",
    "rob",
    "gamble",
    "lottery",
    "invest",
    "tax",
    "market",
    "prices",
    "buy",
    "sell",
    "list",
    "portfolio",
    "viewholdings",
    "market-alerts",
    "inventory",
    "fish",
    "mine",
    "farm",
    "scavenge",
    "log",
    "extract",
    "inspect",
    "lootbox",
    "crate",
    "stocks",
    "stock",
    "buy-stock",
    "sell-stock",
    "watchlist",
    "market-news",
    "dividends",
    "district",
    "leaderboard"
  ]);
  const adminEconomyCommands = new Set([
    "grant",
    "issue-grant",
    "fine",
    "freeze-wallet",
    "unfreeze-wallet",
    "set-tax",
    "trigger-event",
    "wanted",
    "clear",
    "market-event",
    "set-stock-price",
    "suspend-stock",
    "issue-dividend",
    "stock-report",
    "run-tax",
    "economy-report"
  ]);
  const economyCommands = new Set([...helpCommands, ...citizenEconomyCommands, ...adminEconomyCommands]);

  if (!economyCommands.has(name)) {
    return false;
  }

  if (name === "help-economy") {
    await replyEconomy(interaction, helpEmbed("Economy Help", [
      "💳 `/balance` checks your Panem Credit wallet.",
      "🪙 `/pay @user 50` sends credits to a verified citizen.",
      "🏪 `/market` and `/prices` show goods and district prices.",
      "🎒 `/inventory` shows gathered items and resources.",
      "📈 `/stocks` opens the Panem Stock Exchange overview.",
      "Tip: start with `/daily`, then try `/work`, `/market`, or `/inventory`."
    ]), false, economyQuickLinks("portal", "marketplace", "inventory", "stocks"));
    return true;
  }
  if (name === "help-market") {
    await replyEconomy(interaction, helpEmbed("Marketplace Help", [
      "🏪 `/market` shows top goods, prices, stock, and movement.",
      "📊 `/prices` shows district production pressure.",
      "🛒 `/buy grain-sack 2` buys state stock into your inventory.",
      "🏷 `/list grain-sack 1 120` lists held goods for sale.",
      "Tip: District Production affects marketplace prices."
    ]), false, economyQuickLinks("marketplace", "inventory"));
    return true;
  }
  if (name === "help-inventory") {
    await replyEconomy(interaction, helpEmbed("Inventory Help", [
      "🎒 `/inventory` shows your items, value, rarity, and slots.",
      "🎣 `/fish`, ⛏ `/mine`, 🌾 `/farm`, `/scavenge`, `/log`, `/extract` gather goods.",
      "🔎 `/inspect item` shows rarity and value.",
      "📦 `/crate` opens a paid reward crate.",
      "Warning: risky gathering can fine you, lose items, or trigger MSS review."
    ]), false, economyQuickLinks("inventory", "marketplace"));
    return true;
  }
  if (name === "help-stocks") {
    await replyEconomy(interaction, helpEmbed("Stock Market Help", [
      "📈 `/stocks` shows the PSE overview.",
      "🔎 `/stock LBE` shows one company.",
      "🟢 `/buy-stock LBE 5` buys shares.",
      "🔴 `/sell-stock LBE 2` sells shares.",
      "⭐ `/watchlist LBE` tracks or untracks a ticker.",
      "Stocks can rise or fall. District output and events matter."
    ]), false, economyQuickLinks("stocks", "portal"));
    return true;
  }
  if (name === "help-citizen") {
    await replyEconomy(interaction, helpEmbed("Citizen Help", [
      "🛂 Use the Citizen Portal to see Union ID, requests, wallet, inventory, market, and stocks.",
      "💳 `/daily` gives a daily civic payment.",
      "🏛 Submit requests from the website when you need government help.",
      "📜 Taxes help fund the Union. Check `/tax` when unsure."
    ]), false, economyQuickLinks("portal", "transactions"));
    return true;
  }
  if (name === "help-mss") {
    await replyEconomy(interaction, helpEmbed("MSS Help", [
      "🚨 MSS alerts appear after suspicious transfers, contraband, failed crime, or risky market behavior.",
      "Admin tools include `/wanted`, `/clear`, `/freeze-wallet`, and stock portfolio freezes on the website.",
      "Use Government Access for full investigations, watchlists, and financial crime review."
    ]), true, economyQuickLinks("portal"));
    return true;
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

  if (name === "balance" || name === "citizen-dashboard") {
    await replyCitizenDashboard(interaction, "overview");
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
    wallet.loginDays = Array.isArray(wallet.loginDays) ? wallet.loginDays : [];
    const alreadyClaimed = wallet.loginDays.includes(today) || (economy.transactions || []).some((transaction) => transaction.toWalletId === wallet.id && transaction.type === "daily_stipend" && String(transaction.createdAt || "").startsWith(today));
    if (alreadyClaimed) {
      await replyEconomy(interaction, ministryEmbed("Daily Stipend", "Your civic stipend has already been claimed today."));
      return true;
    }
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    wallet.streak = wallet.loginDays.includes(yesterday) ? Number(wallet.streak || 0) + 1 : 1;
    wallet.loginDays = [today, ...wallet.loginDays.filter((day) => day !== today)].slice(0, 21);
    const event = economyActiveEvent(economy);
    const randomBonus = Math.random() < 0.16 ? randomEconomyAmount(25, 175) : 0;
    const weeklyBonus = wallet.streak % 7 === 0 ? 500 : 0;
    const salary = Math.round((Math.max(50, Number(wallet.salary ?? 125)) + wallet.streak * 10 + weeklyBonus + randomBonus) * Number(event.rewardMultiplier || 1));
    wallet.balance += salary;
    pushEconomyTransaction(economy, {
      fromWalletId: "treasury",
      toWalletId: wallet.id,
      amount: salary,
      type: "daily_stipend",
      reason: `Daily Civic Payment. Streak ${wallet.streak}${weeklyBonus ? " / 7-day loyalty bonus" : ""}.`,
      createdBy: interaction.user.id,
      meta: { key: "daily", streak: wallet.streak, eventId: event.id }
    });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Daily Civic Salary", `${formatCredits(salary)} issued.\nStreak: ${wallet.streak} day(s).\nEvent: ${event.title}.`));
    return true;
  }

  if (name === "work" || name === "overtime") {
    const jobId = name === "overtime" ? "overtime" : interaction.options.getString("job") || "work-shift";
    const job = economyJobDefaults.find((entry) => entry.id === jobId) || economyJobDefaults[0];
    if (wallet.status !== "active" || !economyCooldownReady(economy, wallet.id, "work", job.id, job.cooldownHours)) {
      await replyEconomy(interaction, ministryEmbed("Work Desk", "This wallet cannot work that assignment yet. Cooldown or account status applies."));
      return true;
    }
    const district = (economy.districts || []).find((entry) => entry.name === wallet.district);
    const event = economyActiveEvent(economy);
    const districtFit = job.district === "Any" || job.district === wallet.district ? 1.18 : 1;
    const eventBoost = event.boostedDistricts?.includes(wallet.district) ? 1.2 : 1;
    const prosperity = 1 + (Number(district?.prosperityRating || 70) - 70) / 300;
    const reward = Math.round(randomEconomyAmount(job.minReward, job.maxReward) * districtFit * eventBoost * prosperity * Number(event.workMultiplier || 1));
    wallet.balance += reward;
    pushEconomyTransaction(economy, { fromWalletId: "district-production", toWalletId: wallet.id, amount: reward, type: "work", reason: job.name, createdBy: interaction.user.id, meta: { key: job.id, eventId: event.id } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Work Completed", `${job.name}\nReward: ${formatCredits(reward)}\nEvent: ${event.title}`));
    return true;
  }

  if (name === "crime" || name === "rob") {
    const crime = name === "rob"
      ? economyCrimeDefaults.find((entry) => entry.id === "rob-citizen")
      : economyCrimeDefaults.find((entry) => entry.id === interaction.options.getString("action", true)) || economyCrimeDefaults[0];
    const targetUser = name === "rob" ? interaction.options.getUser("user", true) : null;
    const confirmed = interaction.options.getBoolean("confirm") === true;
    if ((name === "rob" || ["counterfeit-credits", "hack-treasury-terminal", "black-market-trade"].includes(crime.id)) && !confirmed) {
      await replyEconomy(interaction, ministryEmbed("Confirmation Required", `This is a risky action and may trigger MSS review.\nRun the command again with \`confirm: True\` to proceed.`), true);
      return true;
    }
    const targetIdentity = targetUser ? getVerifiedDiscordCitizen(governmentStore, economy, targetUser) : null;
    const targetWallet = targetIdentity?.wallet || null;
    if (wallet.status !== "active" || !economyCooldownReady(economy, wallet.id, "crime", crime.id, crime.cooldownHours)) {
      await replyEconomy(interaction, ministryEmbed("Risk Denied", "Cooldown or wallet restrictions prevent that action."));
      return true;
    }
    const event = economyActiveEvent(economy);
    const success = Math.random() < Number(crime.successChance || 0);
    const detected = !success || Math.random() < Math.min(0.95, Number(crime.detectionChance || 0) + Number(event.crimeDetectionBonus || 0));
    let value = success ? randomEconomyAmount(crime.minReward, crime.maxReward) : Math.round(Number(crime.penalty || 0) * Number(event.crimePenaltyMultiplier || 1));
    if (success && targetWallet) {
      value = Math.min(value, Number(targetWallet.balance || 0));
      targetWallet.balance -= value;
    }
    wallet.balance = success ? Number(wallet.balance || 0) + value : Math.max(0, Number(wallet.balance || 0) - value);
    pushEconomyTransaction(economy, { fromWalletId: success ? (targetWallet?.id || "black-market") : wallet.id, toWalletId: success ? wallet.id : "treasury", amount: value, type: "crime", reason: `${crime.name}: ${success ? "success" : "failed"}`, createdBy: interaction.user.id, meta: { key: crime.id, success, detected } });
    if (detected) {
      const alert = { severity: success ? "high" : "critical", type: crime.id, walletId: wallet.id, fine: Math.max(25, Math.round(value * 0.8)), bounty: Math.round(value * 0.75), summary: `MSS Financial Crime Alert: ${wallet.displayName} triggered ${crime.name}.`, action: "investigate" };
      wallet.underReview = true;
      if (["rob-citizen", "counterfeit-credits", "hack-treasury-terminal"].includes(crime.id)) wallet.wanted = true;
      wallet.bounty = Math.max(Number(wallet.bounty || 0), alert.bounty);
      addEconomyAlert(economy, alert);
      await postMssFinancialAlert(alert);
    }
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Risk Result", `${crime.name}: ${success ? "Success" : "Failed"}\n${success ? "Gained" : "Lost"} ${formatCredits(value)}${detected ? "\nMSS alert generated." : ""}`));
    return true;
  }

  if (name === "gamble" || name === "lottery") {
    const game = name === "lottery"
      ? economyGambleDefaults.find((entry) => entry.id === "district-lottery")
      : economyGambleDefaults.find((entry) => entry.id === interaction.options.getString("game")) || economyGambleDefaults[0];
    const bet = Math.max(Number(game.minBet || 1), Math.min(Number(game.maxBet || 500), interaction.options.getNumber("amount") || game.minBet));
    if (bet >= 1000 && interaction.options.getBoolean("confirm") !== true) {
      await replyEconomy(interaction, ministryEmbed("Confirmation Required", `That is a large wager: ${formatCredits(bet)}.\nRun again with \`confirm: True\` to place the bet.`), true);
      return true;
    }
    if (wallet.status !== "active" || wallet.balance < bet || !economyCooldownReady(economy, wallet.id, "gamble", game.id, game.cooldownHours)) {
      await replyEconomy(interaction, ministryEmbed("Games Desk", "The wager cannot be accepted. Check your balance, cooldown, and wallet status. Example: `/gamble amount:50`."));
      return true;
    }
    const won = Math.random() < Number(game.winChance || 0);
    const payout = won ? Math.round(bet * Number(game.payoutMultiplier || 1)) : 0;
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - bet + payout);
    pushEconomyTransaction(economy, { fromWalletId: won ? "capitol-games" : wallet.id, toWalletId: won ? wallet.id : "capitol-games", amount: won ? payout : bet, type: "gamble", reason: game.name, createdBy: interaction.user.id, meta: { key: game.id, bet, won } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed(game.name, won ? `Winner. Payout: ${formatCredits(payout)}.` : `No payout. Stake lost: ${formatCredits(bet)}.`));
    return true;
  }

  if (name === "invest") {
    const fund = investmentFundDefaults.find((entry) => entry.id === interaction.options.getString("fund", true)) || investmentFundDefaults[0];
    const stake = Math.max(25, interaction.options.getNumber("amount", true));
    if (wallet.status !== "active" || wallet.balance < stake) {
      await replyEconomy(interaction, ministryEmbed("Investment Rejected", "Insufficient balance or restricted wallet."));
      return true;
    }
    const lost = Math.random() < Number(fund.lossChance || 0);
    const rate = lost ? -randomEconomyAmount(2, 18) / 100 : Number(fund.minReturn) + Math.random() * (Number(fund.maxReturn) - Number(fund.minReturn));
    const returnAmount = Math.round(stake * rate);
    wallet.balance = Math.max(0, Number(wallet.balance || 0) + returnAmount);
    wallet.investments = [{ id: createId("investment"), fundId: fund.id, amount: stake, returnAmount, createdAt: new Date().toISOString() }, ...(wallet.investments || [])].slice(0, 20);
    pushEconomyTransaction(economy, { fromWalletId: returnAmount >= 0 ? fund.id : wallet.id, toWalletId: returnAmount >= 0 ? wallet.id : fund.id, amount: Math.abs(returnAmount), type: "investment", reason: fund.name, createdBy: interaction.user.id, meta: { key: fund.id, stake, returnAmount } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Investment Settled", `${fund.name}\nStake: ${formatCredits(stake)}\nReturn: ${formatCredits(returnAmount)}`));
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
    const rows = [...(economy.marketItems || [])]
      .sort((a, b) => Math.abs(marketChangePercent(b)) - Math.abs(marketChangePercent(a)))
      .slice(0, 12)
      .map((item) => `${item.name} (${item.district}) - ${formatCredits(item.currentPrice || item.basePrice)} / ${marketChangePercent(item) >= 0 ? "+" : ""}${marketChangePercent(item)}% / stock ${item.stock}`)
      .join("\n");
    await replyEconomy(interaction, ministryEmbed("Marketplace Listings", rows || "No goods listed."), false, economyQuickLinks("marketplace", "inventory"));
    return true;
  }

  if (name === "prices") {
    const rows = [...(economy.districts || [])]
      .sort((a, b) => Number(b.tradeVolume || 0) - Number(a.tradeVolume || 0))
      .slice(0, 10)
      .map((district, index) => {
        const goods = (economy.marketItems || []).filter((item) => item.district === district.name);
        const multiplier = goods.length ? goods.reduce((sum, item) => sum + Number(item.currentPrice || 0) / Math.max(1, Number(item.basePrice || 1)), 0) / goods.length : 1;
        const change = Math.round(((Number(district.demandLevel || 0) - Number(district.supplyLevel || 0)) / 3) * 10) / 10;
        return `${index + 1}. ${district.name} - output ${Math.round((Number(district.supplyLevel || 0) + Number(district.prosperityRating || 0)) / 2)} / x${multiplier.toFixed(2)} / ${change >= 0 ? "+" : ""}${change}%`;
      })
      .join("\n");
    await replyEconomy(interaction, ministryEmbed("District Production Prices", rows || "No district data."));
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
    addEconomyHolding(wallet, item.id, quantity, Number(item.currentPrice || item.basePrice || 0));
    pushEconomyTransaction(economy, {
      fromWalletId: wallet.id,
      toWalletId: "market",
      amount: subtotal,
      type: "market_buy",
      reason: `${quantity} x ${item.name}`,
      taxAmount,
      createdBy: interaction.user.id
    });
    if (item.stock <= 25) {
      await postMarketNotice("Marketplace Shortage Notice", `${item.district} reports low stock for ${item.name}. Remaining stock: ${item.stock}.`);
    }
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Purchase Approved", `${quantity} x ${item.name}\nTotal: ${formatCredits(subtotal + taxAmount)}.`));
    return true;
  }

  if (name === "sell" || name === "list") {
    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity", true);
    const price = interaction.options.getNumber("price");
    const item = (economy.inventoryItems || inventoryItemDefaults).find((entry) => entry.id === itemId || entry.name.toLowerCase() === itemId.toLowerCase()) ||
      (economy.marketItems || []).find((entry) => entry.id === itemId || entry.name.toLowerCase() === itemId.toLowerCase());
    if (item && ["rare", "epic", "legendary"].includes(inventoryRarity(item)) && interaction.options.getBoolean("confirm") !== true) {
      await replyEconomy(interaction, ministryEmbed("Confirmation Required", `${item.name} is ${inventoryRarity(item)}.\nRun again with \`confirm: True\` to sell or list it.`), true);
      return true;
    }
    if (!item || wallet.status !== "active" || !removeEconomyHolding(wallet, item.id, quantity)) {
      await replyEconomy(interaction, ministryEmbed("Listing Rejected", "That item cannot be listed from this wallet. Check `/inventory`, then try `/list item quantity price`."));
      return true;
    }
    if (name === "sell" || !price) {
      const value = inventoryItemValue(item, economy) * quantity;
      wallet.balance += value;
      pushEconomyTransaction(economy, { fromWalletId: "state-procurement", toWalletId: wallet.id, amount: value, type: "inventory_sell", reason: `${quantity} x ${item.name}`, createdBy: interaction.user.id, meta: { key: item.id, quantity } });
      await writeEconomyStore(economy);
      await replyEconomy(interaction, ministryEmbed("State Purchase Recorded", `${quantity} x ${item.name} sold for ${formatCredits(value)}.`));
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
    pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "market-listings", amount: quantity * price, type: "listing_created", reason: `${quantity} x ${item.name}`, createdBy: interaction.user.id, meta: { key: item.id } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Listing Created", `${quantity} x ${item.name} listed at ${formatCredits(price)} each.`));
    return true;
  }

  if (name === "portfolio" || name === "viewholdings") {
    ensureEconomyHoldings(wallet);
    ensureStockCollections(wallet);
    const stockRows = wallet.stockPortfolio
      .slice(0, 8)
      .map((position) => {
        const company = findStockCompany(economy, position.ticker);
        const value = Number(position.shares || 0) * Number(company?.sharePrice || 0);
        return `${position.ticker}: ${position.shares} shares - ${formatCredits(value)}`;
      })
      .join("\n") || "No stock positions.";
    const rows = wallet.holdings
      .slice(0, 10)
      .map((holding) => {
        const item = inventoryItemById(holding.itemId, economy);
        return `${item?.name || holding.itemId}: ${holding.quantity} @ ${formatCredits(holding.averageCost)}`;
      })
      .join("\n") || "No goods held. Buy from /market or the Marketplace page.";
    await replyEconomy(interaction, ministryEmbed("Citizen Portfolio", `Stocks: ${formatCredits(discordStockPortfolioValue(wallet, economy))}\n${stockRows}\n\nInventory:\n${rows}`));
    return true;
  }

  if (name === "market-alerts") {
    const mode = interaction.options.getString("mode", true);
    ensureEconomyHoldings(wallet);
    wallet.marketAlerts = mode === "on";
    pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "market-watch", amount: 0, type: "market_preferences", reason: `Market alerts ${mode}`, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Market Alerts Updated", `Marketplace alerts are now ${mode}.`));
    return true;
  }

  if (name === "stocks") {
    const companies = [...(economy.stockCompanies || stockCompanyDefaults)];
    const index = companies.reduce((sum, company) => sum + Number(company.sharePrice || 0), 0);
    const rows = [...companies]
      .sort((a, b) => Number(b.dailyChangePercent || 0) - Number(a.dailyChangePercent || 0))
      .slice(0, 8)
      .map((company) => `${company.ticker} ${formatCredits(company.sharePrice)} (${Number(company.dailyChangePercent || 0) >= 0 ? "+" : ""}${Number(company.dailyChangePercent || 0).toFixed(1)}%)`)
      .join("\n");
    await replyEconomy(interaction, ministryEmbed("Panem Stock Exchange", `PSE Index: ${index.toLocaleString("en-GB")}\n\n${rows}`), false, economyQuickLinks("stocks", "portal"));
    return true;
  }

  if (name === "stock") {
    const company = findStockCompany(economy, interaction.options.getString("ticker", true));
    if (!company) {
      await replyEconomy(interaction, ministryEmbed("PSE Lookup Failed", "That ticker is not listed on the Panem Stock Exchange."));
      return true;
    }
    await replyEconomy(interaction, ministryEmbed(`${company.ticker} / ${company.name}`, `${company.district} / ${company.sector}\nPrice: ${formatCredits(company.sharePrice)}\nDaily change: ${Number(company.dailyChangePercent || 0) >= 0 ? "+" : ""}${Number(company.dailyChangePercent || 0).toFixed(1)}%\nRisk: ${company.riskLevel}\nDividend: ${(Number(company.dividendRate || 0) * 100).toFixed(1)}%\nStatus: ${company.status}\n\n${company.description}`));
    return true;
  }

  if (name === "buy-stock" || name === "sell-stock") {
    const company = findStockCompany(economy, interaction.options.getString("ticker", true));
    const shares = interaction.options.getInteger("amount", true);
    ensureStockCollections(wallet);
    if (!company || company.status !== "active" || wallet.status !== "active" || wallet.portfolioFrozen || shares <= 0) {
      await replyEconomy(interaction, ministryEmbed("PSE Trade Rejected", "Ticker, trading status, or wallet restrictions prevent this trade."));
      return true;
    }
    const taxRate = Number(economy.stockSettings?.transactionTax || 0.015);
    const fee = Number(economy.stockSettings?.transactionFee || 2);
    const position = getDiscordStockPosition(wallet, company.ticker);
    if (name === "buy-stock") {
      discordMoveStock(company, Math.min(0.018, shares / 10000));
      const subtotal = Math.round(Number(company.sharePrice || 0) * shares * 100) / 100;
      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const total = subtotal + tax + fee;
      if (total >= 5000 && interaction.options.getBoolean("confirm") !== true) {
        await replyEconomy(interaction, ministryEmbed("Confirmation Required", `This stock order costs ${formatCredits(total)}.\nRun again with \`confirm: True\` to buy ${shares} ${company.ticker}.`), true);
        return true;
      }
      if (Number(wallet.balance || 0) < total) {
        await replyEconomy(interaction, ministryEmbed("PSE Trade Rejected", `You need ${formatCredits(total)} for this order. Try fewer shares, for example: \`/buy-stock ${company.ticker} 1\`.`));
        return true;
      }
      const previousShares = Number(position.shares || 0);
      const previousCost = previousShares * Number(position.averagePrice || 0);
      position.shares = previousShares + shares;
      position.averagePrice = Math.round(((previousCost + subtotal) / position.shares) * 100) / 100;
      wallet.balance -= total;
      economy.stockTrades = [{ id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "buy", shares, price: company.sharePrice, subtotal, tax, fee, createdAt: new Date().toISOString(), createdBy: interaction.user.id }, ...(economy.stockTrades || [])].slice(0, 1000);
      pushEconomyTransaction(economy, { fromWalletId: wallet.id, toWalletId: "pse", amount: total, type: "stock_buy", reason: `${shares} ${company.ticker} shares`, taxAmount: tax, createdBy: interaction.user.id, meta: { key: company.ticker } });
      await writeEconomyStore(economy);
      await replyEconomy(interaction, ministryEmbed("PSE Buy Order Filled", `${shares} ${company.ticker} shares purchased for ${formatCredits(total)}.`));
      return true;
    }
    if (Number(position.shares || 0) < shares) {
      await replyEconomy(interaction, ministryEmbed("PSE Trade Rejected", "You do not hold enough shares."));
      return true;
    }
    discordMoveStock(company, -Math.min(0.018, shares / 10000));
    const subtotal = Math.round(Number(company.sharePrice || 0) * shares * 100) / 100;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const proceeds = Math.max(0, subtotal - tax - fee);
    position.shares -= shares;
    wallet.stockPortfolio = wallet.stockPortfolio.filter((entry) => Number(entry.shares || 0) > 0);
    wallet.balance += proceeds;
    economy.stockTrades = [{ id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "sell", shares, price: company.sharePrice, subtotal, tax, fee, createdAt: new Date().toISOString(), createdBy: interaction.user.id }, ...(economy.stockTrades || [])].slice(0, 1000);
    pushEconomyTransaction(economy, { fromWalletId: "pse", toWalletId: wallet.id, amount: proceeds, type: "stock_sell", reason: `${shares} ${company.ticker} shares`, taxAmount: tax, createdBy: interaction.user.id, meta: { key: company.ticker } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("PSE Sell Order Filled", `${shares} ${company.ticker} shares sold for ${formatCredits(proceeds)}.`));
    return true;
  }

  if (name === "inventory") {
    ensureEconomyHoldings(wallet);
    const worth = wallet.holdings.reduce((sum, holding) => {
      const item = inventoryItemById(holding.itemId, economy);
      return sum + inventoryItemValue(item, economy) * Number(holding.quantity || 0);
    }, 0);
    const rows = wallet.holdings
      .slice(0, 12)
      .map((holding) => {
        const item = inventoryItemById(holding.itemId, economy);
        return `${item?.name || holding.itemId}: ${holding.quantity} (${inventoryRarity(item)}) - ${formatCredits(inventoryItemValue(item, economy))}`;
      })
      .join("\n") || "No items held. Try /fish, /mine, /farm, /scavenge, /log, or /extract.";
    await replyEconomy(interaction, ministryEmbed("Citizen Inventory", `Worth: ${formatCredits(worth)}\nSlots: ${occupiedInventorySlots(wallet)} / ${wallet.inventorySlots}\n\n${rows}`), false, economyQuickLinks("inventory", "marketplace"));
    return true;
  }

  if (["fish", "mine", "farm", "scavenge", "log", "extract"].includes(name)) {
    const action = gatheringActionDefaults.find((entry) => entry.command === name || entry.id === name);
    ensureEconomyHoldings(wallet);
    if (!action || wallet.status !== "active" || occupiedInventorySlots(wallet) >= wallet.inventorySlots || !economyCooldownReady(economy, wallet.id, "gather", action.id, action.cooldownHours)) {
      await replyEconomy(interaction, ministryEmbed("Gathering Denied", "Cooldown, inventory slots, or wallet restrictions prevent that action."));
      return true;
    }
    const success = Math.random() < Number(action.successChance || 0);
    const drop = success ? discordRollDrop(action) : null;
    const item = drop ? inventoryItemById(drop.itemId, economy) : null;
    const quantity = drop ? randomEconomyAmount(drop.minQuantity || 1, drop.maxQuantity || 1) : 0;
    const risk = discordRollRisk(action);
    let penalty = 0;
    let lostItemId = "";
    if (risk) {
      penalty = Math.max(0, Number(risk.creditPenalty || 0));
      wallet.balance = Math.max(-1000, Number(wallet.balance || 0) - penalty);
      if (risk.loseItem) lostItemId = removeRandomDiscordHolding(wallet);
      if (risk.cooldownPenaltyHours) {
        wallet.actionBans = [{ actionId: action.id, reason: risk.label, until: new Date(Date.now() + Number(risk.cooldownPenaltyHours) * 60 * 60 * 1000).toISOString() }, ...(wallet.actionBans || [])].slice(0, 10);
      }
      if (risk.mssAlert) {
        const alert = { severity: "high", type: "inventory_risk", walletId: wallet.id, fine: penalty, summary: `MSS Inventory Alert: ${wallet.displayName} triggered ${risk.label} during ${action.name}.`, action: "investigate" };
        addEconomyAlert(economy, alert);
        await postMssFinancialAlert(alert);
      }
    }
    if (item) {
      addEconomyHolding(wallet, item.id, quantity, inventoryItemValue(item, economy));
      wallet.collectionScore = Number(wallet.collectionScore || 0) + Math.round(quantity * rarityMultiplierFor(inventoryRarity(item)) * 10);
      if (["epic", "legendary"].includes(inventoryRarity(item))) {
        wallet.achievements = [...new Set([inventoryRarity(item) === "legendary" ? "Legendary Find" : "Epic Discovery", ...(wallet.achievements || [])])].slice(0, 20);
        await postMarketNotice("Legendary Find Alert", `${wallet.displayName} discovered ${quantity} x ${item.name} through ${action.name}.`);
      }
      if (item.contraband) {
        const alert = { severity: "critical", type: "contraband_inventory", walletId: wallet.id, summary: `${wallet.displayName} acquired restricted inventory: ${item.name}.`, action: "inspect inventory" };
        wallet.inventoryFlags = [{ itemId: item.id, reason: "Restricted acquisition", createdAt: new Date().toISOString() }, ...(wallet.inventoryFlags || [])].slice(0, 10);
        addEconomyAlert(economy, alert);
        await postMssFinancialAlert(alert);
      }
    }
    pushEconomyTransaction(economy, {
      fromWalletId: action.district,
      toWalletId: wallet.id,
      amount: item ? inventoryItemValue(item, economy) * quantity : penalty,
      type: "gather",
      reason: item ? `${action.name}: ${quantity} x ${item.name}` : `${action.name}: ${action.failureText}`,
      createdBy: interaction.user.id,
      meta: { key: action.id, itemId: item?.id || "", quantity, riskId: risk?.id || "", lostItemId }
    });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed(action.name, item ? `${quantity} x ${item.name} acquired.\nRarity: ${inventoryRarity(item)}\nValue: ${formatCredits(inventoryItemValue(item, economy) * quantity)}${risk ? `\nRisk event: ${risk.label}${penalty ? ` (${formatCredits(penalty)} penalty)` : ""}` : ""}` : `${action.failureText}${risk ? `\nRisk event: ${risk.label}` : ""}`));
    return true;
  }

  if (name === "inspect") {
    const itemQuery = interaction.options.getString("item", true).toLowerCase();
    const item = (economy.inventoryItems || inventoryItemDefaults).find((entry) => entry.id === itemQuery || entry.name.toLowerCase() === itemQuery) ||
      (economy.marketItems || []).find((entry) => entry.id === itemQuery || entry.name.toLowerCase() === itemQuery);
    if (!item) {
      await replyEconomy(interaction, ministryEmbed("Inspection Failed", "That item is not registered in the state catalog."));
      return true;
    }
    await replyEconomy(interaction, ministryEmbed("Item Inspection", `${item.name}\nType: ${item.type || item.category || "goods"}\nRarity: ${inventoryRarity(item)}\nValue: ${formatCredits(inventoryItemValue(item, economy))}\nDistrict: ${item.district || "Unassigned"}\n${item.description || "No description."}`));
    return true;
  }

  if (name === "lootbox" || name === "crate") {
    ensureEconomyHoldings(wallet);
    const cost = 150;
    if (wallet.status !== "active" || Number(wallet.balance || 0) < cost || occupiedInventorySlots(wallet) >= wallet.inventorySlots) {
      await replyEconomy(interaction, ministryEmbed("Crate Rejected", "Balance, wallet status, or inventory slots prevent opening a crate."));
      return true;
    }
    wallet.balance -= cost;
    const roll = Math.random();
    const rarity = roll > 0.985 ? "legendary" : roll > 0.93 ? "epic" : roll > 0.78 ? "rare" : roll > 0.48 ? "uncommon" : "common";
    const pool = (economy.inventoryItems || inventoryItemDefaults).filter((item) => item.rarity === rarity && !item.contraband);
    const item = pool[randomEconomyAmount(0, Math.max(0, pool.length - 1))] || inventoryItemDefaults[0];
    const quantity = rarity === "common" ? randomEconomyAmount(1, 4) : 1;
    addEconomyHolding(wallet, item.id, quantity, inventoryItemValue(item, economy));
    pushEconomyTransaction(economy, { fromWalletId: "lucky-crate", toWalletId: wallet.id, amount: inventoryItemValue(item, economy) * quantity, type: "lootbox", reason: `${quantity} x ${item.name}`, createdBy: interaction.user.id, meta: { key: item.id, rarity, quantity } });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("Lucky Crate Opened", `${quantity} x ${item.name}\nRarity: ${rarity}\nValue: ${formatCredits(inventoryItemValue(item, economy) * quantity)}`));
    return true;
  }

  if (name === "watchlist") {
    ensureStockCollections(wallet);
    const ticker = interaction.options.getString("ticker");
    if (ticker) {
      const company = findStockCompany(economy, ticker);
      if (company) {
        wallet.stockWatchlist = wallet.stockWatchlist.includes(company.ticker)
          ? wallet.stockWatchlist.filter((entry) => entry !== company.ticker)
          : [company.ticker, ...wallet.stockWatchlist].slice(0, 20);
        await writeEconomyStore(economy);
      }
    }
    const rows = wallet.stockWatchlist.map((entry) => {
      const company = findStockCompany(economy, entry);
      return `${entry}: ${company ? formatCredits(company.sharePrice) : "Unknown"}`;
    }).join("\n") || "No watched stocks.";
    await replyEconomy(interaction, ministryEmbed("PSE Watchlist", rows));
    return true;
  }

  if (name === "market-news") {
    const rows = (economy.stockEvents || []).slice(0, 8).map((event) => `${event.title} (${event.tickers?.join(", ") || "PSE"})`).join("\n") || "No PSE news recorded.";
    await replyEconomy(interaction, ministryEmbed("PSE Market News", rows));
    return true;
  }

  if (name === "dividends") {
    ensureStockCollections(wallet);
    const rows = wallet.stockPortfolio.map((position) => `${position.ticker}: ${formatCredits(position.dividendsEarned || 0)} earned`).join("\n") || "No dividends recorded.";
    await replyEconomy(interaction, ministryEmbed("PSE Dividends", rows));
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

  if ((name === "grant" || name === "issue-grant") && targetWallet) {
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

  if (name === "wanted" && targetWallet) {
    markDiscordWanted(economy, targetWallet, amount || 500, reason, interaction.user.id);
    await writeEconomyStore(economy);
    await postMssFinancialAlert({ severity: "critical", summary: `${target.tag} marked wanted by MSS Financial Crimes Desk. Bounty: ${formatCredits(targetWallet.bounty)}.`, action: "bounty posted" });
    await replyEconomy(interaction, ministryEmbed("MSS Warrant Posted", `${target.tag} is now wanted.\nBounty: ${formatCredits(targetWallet.bounty)}.`));
    return true;
  }

  if (name === "clear" && targetWallet) {
    targetWallet.wanted = false;
    targetWallet.underReview = false;
    targetWallet.bounty = 0;
    targetWallet.taxStatus = "compliant";
    economy.alerts = (economy.alerts || []).map((alert) => alert.walletId === targetWallet.id ? { ...alert, status: "cleared", resolvedAt: new Date().toISOString(), resolvedBy: interaction.user.id } : alert);
    pushEconomyTransaction(economy, { fromWalletId: "mss", toWalletId: targetWallet.id, amount: 0, type: "pardon", reason, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("MSS Status Cleared", `${target.tag} has been cleared by financial security.`));
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

  if (name === "trigger-event") {
    const eventId = interaction.options.getString("event", true);
    const hours = interaction.options.getInteger("hours") || 168;
    const selected = economyEventDefaults.find((entry) => entry.id === eventId) || economyEventDefaults[0];
    const now = new Date();
    economy.events = [
      { ...selected, status: "active", startsAt: now.toISOString(), endsAt: new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString(), triggeredBy: interaction.user.id },
      ...(economy.events || []).map((entry) => ({ ...entry, status: entry.status === "active" ? "expired" : entry.status }))
    ].slice(0, 20);
    pushEconomyTransaction(economy, { fromWalletId: "treasury", toWalletId: "ledger", amount: 0, type: "economy_event", reason: selected.title, createdBy: interaction.user.id, meta: { key: selected.id } });
    await writeEconomyStore(economy);
    await postMarketNotice("Government Market Notice", `${selected.title}\n${selected.summary}`);
    await replyEconomy(interaction, ministryEmbed("State Event Triggered", `${selected.title}\n${selected.summary}`));
    return true;
  }

  if (name === "market-event") {
    const eventId = interaction.options.getString("event", true);
    const selected = stockMarketEventDefaults.find((entry) => entry.id === eventId) || stockMarketEventDefaults[0];
    const targets = selected.tickers.length ? selected.tickers : (economy.stockCompanies || []).map((company) => company.ticker);
    for (const company of economy.stockCompanies || []) {
      if (targets.includes(company.ticker)) discordMoveStock(company, Number(selected.priceImpact || 0));
    }
    economy.stockEvents = [{ ...selected, id: createId("stock-event"), createdAt: new Date().toISOString(), createdBy: interaction.user.id }, ...(economy.stockEvents || [])].slice(0, 50);
    pushEconomyTransaction(economy, { fromWalletId: "treasury", toWalletId: "pse", amount: 0, type: "stock_event", reason: selected.title, createdBy: interaction.user.id, meta: { key: selected.id } });
    await writeEconomyStore(economy);
    await postMarketNotice("PSE Market Event", selected.title);
    await replyEconomy(interaction, ministryEmbed("PSE Event Triggered", selected.title));
    return true;
  }

  if (name === "set-stock-price") {
    const company = findStockCompany(economy, interaction.options.getString("ticker", true));
    const price = interaction.options.getNumber("price", true);
    if (!company) {
      await replyEconomy(interaction, ministryEmbed("PSE Admin Rejected", "Ticker not found."));
      return true;
    }
    const previous = Number(company.sharePrice || 1);
    company.sharePrice = Math.max(1, price);
    company.dailyChangePercent = Math.round(((company.sharePrice - previous) / previous) * 1000) / 10;
    company.priceHistory = [...(company.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }].slice(-30);
    pushEconomyTransaction(economy, { fromWalletId: "treasury", toWalletId: "pse", amount: 0, type: "stock_admin", reason: `${company.ticker} price set`, createdBy: interaction.user.id });
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("PSE Price Set", `${company.ticker} set to ${formatCredits(company.sharePrice)}.`));
    return true;
  }

  if (name === "suspend-stock") {
    const company = findStockCompany(economy, interaction.options.getString("ticker", true));
    if (!company) {
      await replyEconomy(interaction, ministryEmbed("PSE Admin Rejected", "Ticker not found."));
      return true;
    }
    company.status = company.status === "active" ? "suspended" : "active";
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("PSE Trading Status", `${company.ticker} is now ${company.status}.`));
    return true;
  }

  if (name === "issue-dividend") {
    const ticker = interaction.options.getString("ticker");
    const companies = ticker ? [findStockCompany(economy, ticker)].filter(Boolean) : (economy.stockCompanies || []).filter((company) => Number(company.dividendRate || 0) > 0);
    let totalPaid = 0;
    for (const company of companies) {
      for (const entry of economy.wallets || []) {
        const position = (entry.stockPortfolio || []).find((item) => item.ticker === company.ticker);
        if (!position || Number(position.shares || 0) <= 0) continue;
        const dividend = Math.round(Number(position.shares || 0) * Number(company.sharePrice || 0) * Number(company.dividendRate || 0) * 100) / 100;
        entry.balance += dividend;
        position.dividendsEarned = Number(position.dividendsEarned || 0) + dividend;
        totalPaid += dividend;
        pushEconomyTransaction(economy, { fromWalletId: company.ticker, toWalletId: entry.id, amount: dividend, type: "stock_dividend", reason: `${company.ticker} dividend`, createdBy: interaction.user.id, meta: { key: company.ticker } });
      }
    }
    economy.stockEvents = [{ id: createId("stock-event"), title: `PSE dividends issued: ${formatCredits(totalPaid)}`, tickers: companies.map((company) => company.ticker), priceImpact: 0, severity: "low", createdAt: new Date().toISOString(), createdBy: interaction.user.id }, ...(economy.stockEvents || [])].slice(0, 50);
    await writeEconomyStore(economy);
    await replyEconomy(interaction, ministryEmbed("PSE Dividends Issued", `Total paid: ${formatCredits(totalPaid)}.`));
    return true;
  }

  if (name === "stock-report") {
    const marketValue = (economy.wallets || []).reduce((sum, entry) => sum + discordStockPortfolioValue(entry, economy), 0);
    const suspended = (economy.stockCompanies || []).filter((company) => company.status !== "active").length;
    await replyEconomy(interaction, ministryEmbed("PSE Report", `Companies: ${(economy.stockCompanies || []).length}\nTrades: ${(economy.stockTrades || []).length}\nCitizen portfolio value: ${formatCredits(marketValue)}\nSuspended/frozen listings: ${suspended}`));
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
    new SlashCommandBuilder().setName("help-economy").setDescription("Beginner guide for Panem Credit economy commands."),
    new SlashCommandBuilder().setName("help-market").setDescription("Beginner guide for marketplace commands."),
    new SlashCommandBuilder().setName("help-inventory").setDescription("Beginner guide for inventory and gathering commands."),
    new SlashCommandBuilder().setName("help-stocks").setDescription("Beginner guide for Panem Stock Exchange commands."),
    new SlashCommandBuilder().setName("help-citizen").setDescription("Beginner guide for citizen portal and civic actions."),
    new SlashCommandBuilder().setName("help-mss").setDescription("Beginner guide for MSS economy alerts and actions."),
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
    new SlashCommandBuilder().setName("citizen-dashboard").setDescription("Open your private interactive WPU citizen dashboard."),
    new SlashCommandBuilder()
      .setName("pay")
      .setDescription("Send Panem Credits to another citizen.")
      .addUserOption((option) => option.setName("user").setDescription("Recipient.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Amount of Panem Credits.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName("transactions").setDescription("Show recent Panem Credit transactions."),
    new SlashCommandBuilder().setName("daily").setDescription("Claim the daily civic stipend."),
    new SlashCommandBuilder()
      .setName("work")
      .setDescription("Work a Panem Credit job shift.")
      .addStringOption((option) =>
        option
          .setName("job")
          .setDescription("Job assignment.")
          .addChoices(...economyJobDefaults.slice(0, 25).map((job) => ({ name: job.name, value: job.id })))
      ),
    new SlashCommandBuilder().setName("overtime").setDescription("Work overtime for higher Panem Credit pay."),
    new SlashCommandBuilder()
      .setName("crime")
      .setDescription("Attempt a fictional risky economy action.")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Risk action.")
          .setRequired(true)
          .addChoices(...economyCrimeDefaults.map((crime) => ({ name: crime.name, value: crime.id })))
      )
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm high-risk action.")),
    new SlashCommandBuilder()
      .setName("rob")
      .setDescription("Attempt a fictional robbery against another citizen.")
      .addUserOption((option) => option.setName("user").setDescription("Target citizen.").setRequired(true))
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm MSS-risk action.")),
    new SlashCommandBuilder()
      .setName("gamble")
      .setDescription("Play a Panem Credit chance game.")
      .addNumberOption((option) => option.setName("amount").setDescription("Bet amount.").setRequired(true).setMinValue(1))
      .addStringOption((option) =>
        option
          .setName("game")
          .setDescription("Game.")
          .addChoices(...economyGambleDefaults.filter((game) => game.id !== "district-lottery").map((game) => ({ name: game.name, value: game.id })))
      )
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm large wager.")),
    new SlashCommandBuilder()
      .setName("lottery")
      .setDescription("Buy a District Lottery ticket.")
      .addNumberOption((option) => option.setName("amount").setDescription("Ticket stake.").setMinValue(1)),
    new SlashCommandBuilder()
      .setName("invest")
      .setDescription("Invest Panem Credits in a state fund.")
      .addStringOption((option) =>
        option
          .setName("fund")
          .setDescription("Investment fund.")
          .setRequired(true)
          .addChoices(...investmentFundDefaults.map((fund) => ({ name: fund.name, value: fund.id })))
      )
      .addNumberOption((option) => option.setName("amount").setDescription("Amount to allocate.").setRequired(true).setMinValue(25)),
    new SlashCommandBuilder().setName("tax").setDescription("Show your tax status."),
    new SlashCommandBuilder().setName("market").setDescription("Show marketplace listings."),
    new SlashCommandBuilder().setName("prices").setDescription("Show district production and price changes."),
    new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Buy district goods.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true))
      .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder()
      .setName("sell")
      .setDescription("Sell an inventory item directly to the state.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true))
      .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity.").setRequired(true).setMinValue(1))
      .addNumberOption((option) => option.setName("price").setDescription("Optional unit price; use /list for marketplace listings.").setMinValue(1))
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm rare item sale.")),
    new SlashCommandBuilder()
      .setName("list")
      .setDescription("Create a citizen marketplace listing.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true))
      .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity.").setRequired(true).setMinValue(1))
      .addNumberOption((option) => option.setName("price").setDescription("Unit price.").setRequired(true).setMinValue(1))
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm rare item listing.")),
    new SlashCommandBuilder().setName("portfolio").setDescription("Show your Panem marketplace portfolio."),
    new SlashCommandBuilder().setName("viewholdings").setDescription("Show your held market goods."),
    new SlashCommandBuilder().setName("inventory").setDescription("Show your inventory items, rarity, slots, and worth."),
    new SlashCommandBuilder().setName("fish").setDescription("Gather fish and rare catches in District 4."),
    new SlashCommandBuilder().setName("mine").setDescription("Mine coal, ore, and rare relics in District 12."),
    new SlashCommandBuilder().setName("farm").setDescription("Farm grain, crops, and harvest caches."),
    new SlashCommandBuilder().setName("scavenge").setDescription("Scavenge transport salvage and rail artifacts."),
    new SlashCommandBuilder().setName("log").setDescription("Gather timber and heartwood in District 7."),
    new SlashCommandBuilder().setName("extract").setDescription("Extract energy cells and risky power cores."),
    new SlashCommandBuilder()
      .setName("inspect")
      .setDescription("Inspect an inventory item value and rarity.")
      .addStringOption((option) => option.setName("item").setDescription("Item ID or name.").setRequired(true)),
    new SlashCommandBuilder().setName("lootbox").setDescription("Open a paid inventory reward crate."),
    new SlashCommandBuilder().setName("crate").setDescription("Open a paid inventory reward crate."),
    new SlashCommandBuilder().setName("stocks").setDescription("Show Panem Stock Exchange overview."),
    new SlashCommandBuilder()
      .setName("stock")
      .setDescription("Show one PSE company.")
      .addStringOption((option) => option.setName("ticker").setDescription("Ticker, e.g. LBE.").setRequired(true)),
    new SlashCommandBuilder()
      .setName("buy-stock")
      .setDescription("Buy PSE shares.")
      .addStringOption((option) => option.setName("ticker").setDescription("Ticker, e.g. LBE.").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("Shares.").setRequired(true).setMinValue(1))
      .addBooleanOption((option) => option.setName("confirm").setDescription("Confirm expensive order.")),
    new SlashCommandBuilder()
      .setName("sell-stock")
      .setDescription("Sell PSE shares.")
      .addStringOption((option) => option.setName("ticker").setDescription("Ticker, e.g. LBE.").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("Shares.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder()
      .setName("watchlist")
      .setDescription("Show or toggle your PSE watchlist.")
      .addStringOption((option) => option.setName("ticker").setDescription("Optional ticker to toggle.")),
    new SlashCommandBuilder().setName("market-news").setDescription("Show latest PSE market news."),
    new SlashCommandBuilder().setName("dividends").setDescription("Show PSE dividend payments."),
    new SlashCommandBuilder()
      .setName("market-alerts")
      .setDescription("Turn Panem marketplace alerts on or off.")
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Alert mode.")
          .setRequired(true)
          .addChoices({ name: "On", value: "on" }, { name: "Off", value: "off" })
      ),
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
      .setName("issue-grant")
      .setDescription("Issue a limited-time state grant.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Recipient.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Amount.").setRequired(true).setMinValue(1))
      .addStringOption((option) => option.setName("reason").setDescription("Grant reason.").setMaxLength(300)),
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
      .setName("trigger-event")
      .setDescription("Trigger a rotating Panem Credit economy event.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("event")
          .setDescription("State event.")
          .setRequired(true)
          .addChoices(...economyEventDefaults.map((event) => ({ name: event.title, value: event.id })))
      )
      .addIntegerOption((option) => option.setName("hours").setDescription("Duration in hours.").setMinValue(1).setMaxValue(720)),
    new SlashCommandBuilder()
      .setName("wanted")
      .setDescription("Mark a user as a wanted financier.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Citizen.").setRequired(true))
      .addNumberOption((option) => option.setName("amount").setDescription("Bounty amount.").setMinValue(1))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Clear a user's MSS financial status.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) => option.setName("user").setDescription("Citizen.").setRequired(true))
      .addStringOption((option) => option.setName("reason").setDescription("Reason.").setMaxLength(300)),
    new SlashCommandBuilder()
      .setName("market-event")
      .setDescription("Trigger a PSE market event.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("event")
          .setDescription("PSE event.")
          .setRequired(true)
          .addChoices(...stockMarketEventDefaults.map((event) => ({ name: event.title.slice(0, 100), value: event.id })))
      ),
    new SlashCommandBuilder()
      .setName("set-stock-price")
      .setDescription("Set a PSE share price.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => option.setName("ticker").setDescription("Ticker.").setRequired(true))
      .addNumberOption((option) => option.setName("price").setDescription("Share price.").setRequired(true).setMinValue(1)),
    new SlashCommandBuilder()
      .setName("suspend-stock")
      .setDescription("Toggle PSE trading suspension.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => option.setName("ticker").setDescription("Ticker.").setRequired(true)),
    new SlashCommandBuilder()
      .setName("issue-dividend")
      .setDescription("Issue PSE dividends.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => option.setName("ticker").setDescription("Optional ticker.")),
    new SlashCommandBuilder()
      .setName("stock-report")
      .setDescription("Show a PSE admin report.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
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
  try {
    if (await handleCitizenDashboardComponent(interaction)) {
      return;
    }

    if (await handleCitizenDashboardModal(interaction)) {
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

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
