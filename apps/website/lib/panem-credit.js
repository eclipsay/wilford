import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  calculateMarketPrice,
  blackMarketGoodsDefaults,
  compactEconomyStoreForWrite,
  craftingQualityTiers,
  craftingRecipeDefaults,
  dynamicEconomyEventDefaults,
  districtMarketEventDefaults,
  districtEconomyDefaults,
  economyCrimeDefaults,
  economyEventDefaults,
  economyGambleDefaults,
  economyJobDefaults,
  gatheringActionDefaults,
  getJobAccess,
  getLootboxCrate,
  investmentFundDefaults,
  inventoryItemDefaults,
  inventoryRarityTiers,
  lootboxDailyGlobalLimit,
  lootboxDailyUserLimit,
  marketItemDefaults,
  normalizeEconomyDistrict,
  prestigeItemDefaults,
  stockCompanyDefaults,
  stockMarketEventDefaults,
  taxTypes,
  walletStatuses
} from "@wilford/shared";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

const seedWallets = [
  ["wallet-chairman", "chairman", "", "Chairman Lemmie", 125000, "The Capitol", 1500],
  ["wallet-eclip", "eclip", "", "Executive Director Eclip", 82000, "District 3", 1000],
  ["wallet-flukkston", "flukkston", "", "Sir Flukkston", 64000, "District 2", 900],
  ["wallet-citizen", "citizen", "", "Registered Citizen", 12480, "District 8", 125]
].map(([id, userId, discordId, displayName, balance, district, salary]) => ({
  id,
  userId,
  discordId,
    displayName,
    balance,
    district,
    title: "",
    salary,
    status: "active",
  taxStatus: "compliant",
  exempt: false,
  underReview: false,
  linkedEnemyRecordId: "",
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z"
}));

function cleanText(value, maxLength = 300) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function randomInt(min, max) {
  const low = Math.ceil(Number(min || 0));
  const high = Math.floor(Number(max || low));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function activeEvent(store) {
  return activeEvents(store)[0] || economyEventDefaults[0];
}

function activeEvents(store) {
  const now = Date.now();
  return (store.events || []).filter((event) =>
    event.status === "active" &&
    (!event.endsAt || Date.parse(event.endsAt) > now)
  );
}

function eventMultiplier(store, key, fallback = 1) {
  const events = activeEvents(store);
  if (!events.length) {
    const value = Number(activeEvent(store)?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return events.reduce((value, event) => value * Math.max(0, Number(event?.[key] ?? 1)), fallback);
}

function eventAffectsDistrict(event, district) {
  return (event.affectedDistricts || event.boostedDistricts || []).includes(district);
}

function eventAffectsGood(event, item) {
  return (event.affectedGoods || []).includes(item?.id) || eventAffectsDistrict(event, item?.district);
}

function eventAffectsCompany(event, company) {
  return (event.affectedCompanies || event.tickers || []).includes(company?.ticker) || eventAffectsDistrict(event, company?.district);
}

function activeModifierSum(store, matcher, key) {
  return activeEvents(store).reduce((sum, event) => matcher(event) ? sum + Number(event.modifiers?.[key] || 0) : sum, 0);
}

function isCooldownReady(store, walletId, type, key, cooldownHours) {
  const last = (store.transactions || []).find((transaction) =>
    transaction.fromWalletId === walletId || transaction.toWalletId === walletId
      ? transaction.type === type && transaction.meta?.key === key
      : false
  );
  if (!last) return true;
  const elapsedMs = Date.now() - Date.parse(last.createdAt || 0);
  return elapsedMs >= Number(cooldownHours || 0) * 60 * 60 * 1000;
}

function ensureWalletCollections(wallet) {
  wallet.streak = Math.max(0, Number(wallet.streak || 0));
  wallet.loginDays = Array.isArray(wallet.loginDays) ? wallet.loginDays.slice(0, 14) : [];
  wallet.investments = Array.isArray(wallet.investments) ? wallet.investments : [];
  wallet.properties = Array.isArray(wallet.properties) ? wallet.properties : [];
  wallet.badges = Array.isArray(wallet.badges) ? wallet.badges : [];
  wallet.bounty = Math.max(0, Number(wallet.bounty || 0));
  wallet.wanted = Boolean(wallet.wanted);
  wallet.seizedCredits = Math.max(0, Number(wallet.seizedCredits || 0));
  wallet.holdings = Array.isArray(wallet.holdings) ? wallet.holdings : [];
  wallet.watchlist = Array.isArray(wallet.watchlist) ? wallet.watchlist : [];
  wallet.favouriteDistricts = Array.isArray(wallet.favouriteDistricts) ? wallet.favouriteDistricts : [];
  wallet.marketAlerts = wallet.marketAlerts !== false;
  wallet.stockPortfolio = Array.isArray(wallet.stockPortfolio) ? wallet.stockPortfolio : [];
  wallet.stockWatchlist = Array.isArray(wallet.stockWatchlist) ? wallet.stockWatchlist : [];
  wallet.portfolioFrozen = Boolean(wallet.portfolioFrozen);
  wallet.inventorySlots = Math.max(20, Number(wallet.inventorySlots || 40));
  wallet.inventoryFlags = Array.isArray(wallet.inventoryFlags) ? wallet.inventoryFlags : [];
  wallet.actionBans = Array.isArray(wallet.actionBans) ? wallet.actionBans : [];
  wallet.achievements = Array.isArray(wallet.achievements) ? wallet.achievements : [];
  wallet.craftingXp = Math.max(0, Number(wallet.craftingXp || 0));
  wallet.craftingLevel = Math.max(1, Number(wallet.craftingLevel || levelForXp(wallet.craftingXp)));
  wallet.jobXp = Math.max(0, Number(wallet.jobXp || 0));
  wallet.jobLevel = Math.max(1, Number(wallet.jobLevel || levelForXp(wallet.jobXp)));
  wallet.unlockedRecipes = Array.isArray(wallet.unlockedRecipes) ? wallet.unlockedRecipes : [];
  wallet.suspicionLevel = Math.max(0, Math.min(100, Number(wallet.suspicionLevel || 0)));
  wallet.securityStatus = cleanText(wallet.securityStatus || "Clear", 80);
  wallet.raidCooldownUntil = cleanText(wallet.raidCooldownUntil || "", 80);
  wallet.collectionScore = Math.max(0, Number(wallet.collectionScore || 0));
}

function suspicionBand(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Elevated";
  return "Clear";
}

function itemRaidWeight(item) {
  if (item?.contraband) return 1;
  return { common: 0.08, uncommon: 0.14, rare: 0.28, epic: 0.48, legendary: 0.72 }[itemRarity(item)] || 0.12;
}

export function calculateWalletSuspicion(store, wallet) {
  if (!wallet) return { score: 0, status: "Clear", reasons: [] };
  ensureWalletCollections(wallet);
  const inventoryValue = wallet.holdings.reduce((sum, holding) => {
    const item = getInventoryItem(holding.itemId);
    return sum + itemValue(item, store) * Number(holding.quantity || 0);
  }, 0);
  const contrabandCount = wallet.holdings.reduce((sum, holding) => {
    const item = getInventoryItem(holding.itemId);
    return sum + (item?.contraband ? Number(holding.quantity || 0) : 0);
  }, 0);
  const recent = (store.transactions || []).filter((transaction) =>
    (transaction.fromWalletId === wallet.id || transaction.toWalletId === wallet.id) &&
    Date.now() - Date.parse(transaction.createdAt || 0) < 7 * 24 * 60 * 60 * 1000
  );
  const rapidGain = recent.filter((transaction) => transaction.toWalletId === wallet.id).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const risky = recent.filter((transaction) => ["crime", "gamble", "lootbox", "black-market", "rob"].includes(transaction.type)).length;
  const reasons = [];
  let score = Number(wallet.suspicionLevel || 0);
  if (inventoryValue > 5000) {
    score += Math.min(25, Math.floor(inventoryValue / 1200));
    reasons.push("large inventory stockpile");
  }
  if (contrabandCount) {
    score += Math.min(40, contrabandCount * 16);
    reasons.push("restricted inventory");
  }
  if (Number(wallet.balance || 0) > 25000) {
    score += Math.min(20, Math.floor(Number(wallet.balance || 0) / 10000));
    reasons.push("large balance");
  }
  if (risky) {
    score += Math.min(25, risky * 4);
    reasons.push("risky actions");
  }
  if (rapidGain > 8000) {
    score += Math.min(20, Math.floor(rapidGain / 4000));
    reasons.push("rapid wealth increase");
  }
  if (wallet.taxStatus && wallet.taxStatus !== "compliant") {
    score += 12;
    reasons.push("tax irregularity");
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, status: suspicionBand(score), reasons };
}

function getHolding(wallet, itemId) {
  ensureWalletCollections(wallet);
  let holding = wallet.holdings.find((entry) => entry.itemId === itemId);
  if (!holding) {
    holding = { itemId, quantity: 0, averageCost: 0, durability: 100, acquiredAt: new Date().toISOString(), acquisitionHistory: [] };
    wallet.holdings.push(holding);
  }
  return holding;
}

function levelForXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp || 0)) / 100)) + 1);
}

function jobAccessForWallet(wallet, job) {
  return getJobAccess(wallet, job);
}

function recipeDistrictMatch(wallet, recipe) {
  const district = wallet?.district || "";
  return recipe?.district === district || (recipe?.secondaryDistricts || []).includes(district);
}

function rollCraftQuality(level = 1, specialist = false) {
  const bonus = Math.max(0, Number(level || 1) - 1) * 0.4 + (specialist ? 3 : 0);
  const tiers = craftingQualityTiers.map((tier, index) => ({
    ...tier,
    weight: Math.max(0.1, Number(tier.weight || 1) + (index * bonus) - (index === 0 ? bonus : 0))
  }));
  const total = tiers.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = Math.random() * total;
  for (const tier of tiers) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return tiers[0];
}

function resetLootboxAllocation(store) {
  const today = new Date().toISOString().slice(0, 10);
  if (store.lootboxAllocationDate !== today) {
    store.lootboxAllocationDate = today;
    store.globalLootboxesOpenedToday = 0;
    store.perUserLootboxesOpenedToday = {};
  }
  store.perUserLootboxesOpenedToday = store.perUserLootboxesOpenedToday && typeof store.perUserLootboxesOpenedToday === "object"
    ? store.perUserLootboxesOpenedToday
    : {};
}

function rollLootboxReward(store, crate) {
  const roll = Math.random();
  if (roll < Number(crate.lowRollChance || 0)) {
    const item = inventoryItemDefaults.find((entry) => entry.id === "grain-sack") || inventoryItemDefaults[0];
    return { item, quantity: 1, rarity: "common", lowRoll: true, taxPenalty: Math.round(Number(crate.price || 0) * 0.08) };
  }
  const legendaryCutoff = 1 - Number(crate.legendaryChance || 0);
  const epicCutoff = legendaryCutoff - Number(crate.epicChance || 0);
  const rareCutoff = epicCutoff - Number(crate.rareChance || 0);
  const rarity = roll > legendaryCutoff ? "legendary" : roll > epicCutoff ? "epic" : roll > rareCutoff ? "rare" : roll > 0.45 ? "uncommon" : "common";
  const pool = inventoryItemDefaults.filter((item) => item.rarity === rarity && !item.contraband);
  const item = pool[randomInt(0, Math.max(0, pool.length - 1))] || inventoryItemDefaults[0];
  const quantity = rarity === "common" ? randomInt(1, 3) : rarity === "uncommon" ? randomInt(1, 2) : 1;
  return { item, quantity, rarity, lowRoll: false, taxPenalty: 0 };
}

function hasMaterials(wallet, materials = []) {
  ensureWalletCollections(wallet);
  return materials.every((material) => {
    const holding = wallet.holdings.find((entry) => entry.itemId === material.itemId);
    return Number(holding?.quantity || 0) >= Number(material.quantity || 0);
  });
}

function consumeMaterials(wallet, materials = [], fail = false) {
  const consumed = [];
  for (const material of materials) {
    const quantity = fail ? Math.max(1, Math.ceil(Number(material.quantity || 1) / 2)) : Number(material.quantity || 1);
    if (removeHolding(wallet, material.itemId, quantity)) {
      consumed.push({ itemId: material.itemId, quantity });
    }
  }
  return consumed;
}

function getInventoryItem(itemId) {
  return inventoryItemDefaults.find((item) => item.id === itemId) || marketItemDefaults.find((item) => item.id === itemId);
}

function itemRarity(item) {
  return item?.rarity || (item?.restricted ? "rare" : "common");
}

function rarityMultiplier(rarity) {
  return inventoryRarityTiers.find((tier) => tier.id === rarity)?.multiplier || 1;
}

function itemValue(item, store) {
  const market = store?.marketItems?.find((entry) => entry.id === item?.id);
  const base = Number(item?.baseValue || market?.currentPrice || market?.basePrice || item?.basePrice || 1);
  const district = store?.districts?.find((entry) => entry.name === (item?.district || market?.district));
  const pressure = district ? 1 + (Number(district.demandLevel || 70) - Number(district.supplyLevel || 70)) / 260 : 1;
  return Math.max(1, Math.round(base * rarityMultiplier(itemRarity(item)) * pressure));
}

function addHolding(wallet, itemId, quantity, unitPrice = 0, source = "market") {
  const holding = getHolding(wallet, itemId);
  const item = getInventoryItem(itemId);
  const count = Math.max(1, Number(quantity || 1));
  const previousQuantity = Number(holding.quantity || 0);
  const previousCost = Number(holding.averageCost || 0) * previousQuantity;
  holding.quantity = previousQuantity + count;
  holding.averageCost = Math.round(((previousCost + Number(unitPrice || 0) * count) / holding.quantity) * 100) / 100;
  holding.rarity = itemRarity(item);
  holding.type = item?.type || item?.category || "goods";
  holding.durability = Math.min(100, Math.max(0, Number(holding.durability ?? item?.durability ?? 100)));
  holding.acquisitionHistory = [
    { source, quantity: count, unitPrice: Number(unitPrice || 0), createdAt: new Date().toISOString() },
    ...(holding.acquisitionHistory || [])
  ].slice(0, 12);
}

function removeHolding(wallet, itemId, quantity) {
  const holding = getHolding(wallet, itemId);
  const count = Math.max(1, Number(quantity || 1));
  if (Number(holding.quantity || 0) < count) return false;
  holding.quantity -= count;
  wallet.holdings = wallet.holdings.filter((entry) => Number(entry.quantity || 0) > 0);
  return true;
}

function marketChangePercent(item) {
  const base = Number(item?.basePrice || item?.currentPrice || 1);
  const current = Number(item?.currentPrice || base);
  return Math.round(((current - base) / base) * 1000) / 10;
}

function occupiedInventorySlots(wallet) {
  ensureWalletCollections(wallet);
  return wallet.holdings.reduce((sum, holding) => sum + Math.max(0, Number(holding.quantity || 0)), 0);
}

function hasActionBan(wallet, actionId) {
  ensureWalletCollections(wallet);
  const now = Date.now();
  wallet.actionBans = wallet.actionBans.filter((ban) => Date.parse(ban.until || 0) > now);
  return wallet.actionBans.some((ban) => ban.actionId === actionId || ban.actionId === "all");
}

function rollDrop(action) {
  const roll = Math.random();
  let cursor = 0;
  for (const drop of action.drops || []) {
    cursor += Number(drop.chance || 0);
    if (roll <= cursor) return drop;
  }
  return null;
}

function rollRisk(action) {
  return (action.riskEvents || []).find((risk) => Math.random() < Number(risk.chance || 0)) || null;
}

function loseRandomHolding(wallet) {
  ensureWalletCollections(wallet);
  const candidates = wallet.holdings.filter((holding) => Number(holding.quantity || 0) > 0);
  if (!candidates.length) return null;
  const holding = candidates[randomInt(0, candidates.length - 1)];
  removeHolding(wallet, holding.itemId, 1);
  return holding.itemId;
}

function getStockPosition(wallet, ticker) {
  ensureWalletCollections(wallet);
  let position = wallet.stockPortfolio.find((entry) => entry.ticker === ticker);
  if (!position) {
    position = { ticker, shares: 0, averagePrice: 0, dividendsEarned: 0 };
    wallet.stockPortfolio.push(position);
  }
  return position;
}

function stockVolatility(riskLevel) {
  return {
    Stable: 0.015,
    Moderate: 0.035,
    Volatile: 0.065,
    Speculative: 0.1,
    Restricted: 0.14
  }[riskLevel] || 0.035;
}

function districtStockPressure(store, company) {
  const district = store.districts.find((entry) => entry.name === company.district);
  if (!district) return 0;
  return (Number(district.prosperityRating || 70) - 70) / 500 + (Number(district.supplyLevel || 70) - Number(district.demandLevel || 70)) / 900;
}

function goodsStockPressure(store, company) {
  const goods = store.marketItems.filter((item) => item.district === company.district);
  if (!goods.length) return 0;
  const averageChange = goods.reduce((sum, item) => sum + marketChangePercent(item), 0) / goods.length;
  const sectorBoost = /energy|luxury|food|mining|raw|technology|transport/i.test(company.sector) ? averageChange / 900 : averageChange / 1400;
  return sectorBoost;
}

function applyStockMovement(store, company, tradePressure = 0) {
  const volatility = stockVolatility(company.riskLevel);
  const noise = (Math.random() - 0.5) * volatility;
  const movement = districtStockPressure(store, company) + goodsStockPressure(store, company) + tradePressure + noise;
  const previous = Number(company.sharePrice || 1);
  company.sharePrice = Math.max(1, Math.round(previous * (1 + movement) * 100) / 100);
  company.dailyChangePercent = Math.round(((company.sharePrice - previous) / previous) * 1000) / 10;
  company.marketCap = Math.max(1000, Math.round(Number(company.marketCap || 0) * (1 + company.dailyChangePercent / 100)));
  company.priceHistory = [
    ...(company.priceHistory || []),
    { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }
  ].slice(-30);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function defaultTaxRates() {
  return Object.fromEntries(taxTypes.map((tax) => [tax.id, tax.defaultRate]));
}

export function normalizeEconomyStore(economy = {}) {
  const storedDistricts = Array.isArray(economy.districts) && economy.districts.length
    ? economy.districts
    : districtEconomyDefaults;
  const storedDistrictKeys = new Set(storedDistricts.map((district) => district.id || district.name));
  const districts = [
    ...storedDistricts,
    ...districtEconomyDefaults.filter((district) => !storedDistrictKeys.has(district.id) && !storedDistrictKeys.has(district.name))
  ];
  const marketItems = (Array.isArray(economy.marketItems) && economy.marketItems.length
    ? economy.marketItems
    : marketItemDefaults
  ).map((item) => {
    const district = districts.find((districtItem) => districtItem.name === item.district);
    return {
      ...item,
      currentPrice: calculateMarketPrice(item, district)
    };
  });

  return {
    wallets: (Array.isArray(economy.wallets) && economy.wallets.length ? economy.wallets : seedWallets).map((wallet) => ({
      ...wallet,
      salary: Math.max(0, Number(wallet.salary ?? 125)),
      streak: Math.max(0, Number(wallet.streak || 0)),
      loginDays: Array.isArray(wallet.loginDays) ? wallet.loginDays : [],
      investments: Array.isArray(wallet.investments) ? wallet.investments : [],
      properties: Array.isArray(wallet.properties) ? wallet.properties : [],
      badges: Array.isArray(wallet.badges) ? wallet.badges : [],
      bounty: Math.max(0, Number(wallet.bounty || 0)),
      wanted: Boolean(wallet.wanted),
      seizedCredits: Math.max(0, Number(wallet.seizedCredits || 0)),
      debt: Math.max(0, Number(wallet.debt || 0)),
      holdings: Array.isArray(wallet.holdings) ? wallet.holdings : [],
      watchlist: Array.isArray(wallet.watchlist) ? wallet.watchlist : [],
      favouriteDistricts: Array.isArray(wallet.favouriteDistricts) ? wallet.favouriteDistricts : [],
      marketAlerts: wallet.marketAlerts !== false,
      stockPortfolio: Array.isArray(wallet.stockPortfolio) ? wallet.stockPortfolio : [],
      stockWatchlist: Array.isArray(wallet.stockWatchlist) ? wallet.stockWatchlist : [],
      portfolioFrozen: Boolean(wallet.portfolioFrozen),
      inventorySlots: Math.max(20, Number(wallet.inventorySlots || 40)),
      inventoryFlags: Array.isArray(wallet.inventoryFlags) ? wallet.inventoryFlags : [],
      actionBans: Array.isArray(wallet.actionBans) ? wallet.actionBans : [],
      achievements: Array.isArray(wallet.achievements) ? wallet.achievements : [],
      craftingXp: Math.max(0, Number(wallet.craftingXp || 0)),
      craftingLevel: Math.max(1, Number(wallet.craftingLevel || levelForXp(wallet.craftingXp))),
      jobXp: Math.max(0, Number(wallet.jobXp || 0)),
      jobLevel: Math.max(1, Number(wallet.jobLevel || levelForXp(wallet.jobXp))),
      unlockedRecipes: Array.isArray(wallet.unlockedRecipes) ? wallet.unlockedRecipes : [],
      workPermits: Array.isArray(wallet.workPermits) ? wallet.workPermits : [],
      selectedJobId: cleanText(wallet.selectedJobId || "", 120),
      jobChangedAt: cleanText(wallet.jobChangedAt || "", 80),
      suspicionLevel: Math.max(0, Math.min(100, Number(wallet.suspicionLevel || 0))),
      securityStatus: cleanText(wallet.securityStatus || "Clear", 80),
      raidCooldownUntil: cleanText(wallet.raidCooldownUntil || "", 80),
      collectionScore: Math.max(0, Number(wallet.collectionScore || 0))
    })),
    transactions: Array.isArray(economy.transactions) ? economy.transactions : [],
    marketItems,
    listings: Array.isArray(economy.listings) ? economy.listings : [],
    taxRecords: Array.isArray(economy.taxRecords) ? economy.taxRecords : [],
    taxRates: { ...defaultTaxRates(), ...(economy.taxRates || {}) },
    districts,
    alerts: Array.isArray(economy.alerts) ? economy.alerts : [],
    raidLogs: Array.isArray(economy.raidLogs) ? economy.raidLogs : [],
    lootboxAllocationDate: cleanText(economy.lootboxAllocationDate || "", 20),
    globalLootboxesOpenedToday: Math.max(0, Number(economy.globalLootboxesOpenedToday || 0)),
    perUserLootboxesOpenedToday: economy.perUserLootboxesOpenedToday && typeof economy.perUserLootboxesOpenedToday === "object" ? economy.perUserLootboxesOpenedToday : {},
    lootboxLogs: Array.isArray(economy.lootboxLogs) ? economy.lootboxLogs : [],
    gamblingJackpot: Math.max(500, Number(economy.gamblingJackpot || 2500)),
    categories: Array.isArray(economy.categories) && economy.categories.length
      ? economy.categories
      : [...new Set(marketItemDefaults.map((item) => item.category))],
    events: Array.isArray(economy.events) && economy.events.length ? economy.events : [
      {
        ...economyEventDefaults[0],
        status: "active",
        startsAt: "2026-04-28T00:00:00.000Z",
        endsAt: "2026-05-05T00:00:00.000Z"
      }
    ],
    jobs: economyJobDefaults,
    crimes: economyCrimeDefaults,
    games: economyGambleDefaults,
    blackMarketGoods: Array.isArray(economy.blackMarketGoods) && economy.blackMarketGoods.length ? economy.blackMarketGoods : blackMarketGoodsDefaults,
    funds: investmentFundDefaults,
    prestigeItems: prestigeItemDefaults,
    marketEvents: Array.isArray(economy.marketEvents) ? economy.marketEvents : districtMarketEventDefaults,
    inventoryItems: Array.isArray(economy.inventoryItems) && economy.inventoryItems.length ? economy.inventoryItems : inventoryItemDefaults,
    rarityTiers: inventoryRarityTiers,
    gatheringActions: gatheringActionDefaults,
    craftingRecipes: Array.isArray(economy.craftingRecipes) && economy.craftingRecipes.length ? economy.craftingRecipes : craftingRecipeDefaults,
    craftingQualityTiers,
    inventoryChallenges: Array.isArray(economy.inventoryChallenges) && economy.inventoryChallenges.length
      ? economy.inventoryChallenges
      : [
          { id: "weekly-district-4-catch", title: "District 4 Champion Fisher", actionId: "fish", target: 10, reward: 350 },
          { id: "weekly-master-miner", title: "Master Miner", actionId: "mine", target: 8, reward: 400 },
          { id: "collector-relic-drive", title: "Relic Preservation Drive", rarity: "legendary", target: 1, reward: 1000 }
        ],
    stockCompanies: Array.isArray(economy.stockCompanies) && economy.stockCompanies.length ? economy.stockCompanies : stockCompanyDefaults,
    stockTrades: Array.isArray(economy.stockTrades) ? economy.stockTrades : [],
    stockEvents: Array.isArray(economy.stockEvents) && economy.stockEvents.length
      ? economy.stockEvents
      : [
          {
            id: "pse-opening-bell",
            title: "Panem Stock Exchange opens under Treasury supervision",
            tickers: ["PCB", "LBE", "CLH"],
            priceImpact: 0.02,
            severity: "low",
            createdAt: "2026-04-28T00:00:00.000Z"
          }
        ],
    stockSettings: { transactionTax: 0.015, transactionFee: 2, ...(economy.stockSettings || {}) },
    marketNotices: Array.isArray(economy.marketNotices) && economy.marketNotices.length
      ? economy.marketNotices
      : [
          {
            id: "notice-export-restrictions",
            title: "Export Restrictions Under Review",
            body: "Restricted strategic goods remain subject to Ministry approval.",
            severity: "medium",
            createdAt: "2026-04-28T00:00:00.000Z"
          },
          {
            id: "notice-state-investment-drive",
            title: "State Investment Drive",
            body: "District Bonds and Rail Expansion Fund remain open to compliant citizens.",
            severity: "low",
            createdAt: "2026-04-28T00:00:00.000Z"
          }
        ],
    bounties: Array.isArray(economy.bounties) ? economy.bounties : []
  };
}

function contentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json") : null,
    resolve(currentDir, "../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);
  return candidates[0];
}

function fallbackFile() {
  return resolve(tmpdir(), "wilford-panem-credit.json");
}

function adminApiKey() {
  return process.env.GOVERNMENT_STORE_API_KEY || process.env.BULLETIN_API_KEY || process.env.ADMIN_API_KEY;
}

async function readRemoteStore() {
  const key = adminApiKey();
  if (!key) {
    throw new Error("Missing admin API key.");
  }

  const response = await fetch(`${baseUrl}/api/admin/economy-store`, {
    headers: { "x-admin-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(4000)
  });

  if (!response.ok) {
    throw new Error(`Economy store read failed with ${response.status}.`);
  }

  const parsed = await response.json();
  return parsed.economy || parsed;
}

async function writeRemoteStore(economy) {
  const key = adminApiKey();
  if (!key) {
    throw new Error("Missing admin API key.");
  }

  const response = await fetch(`${baseUrl}/api/admin/economy-store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key
    },
    body: JSON.stringify({ economy: compactEconomyStoreForWrite(economy) }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Economy store write failed with ${response.status}.`);
  }

  const parsed = await response.json();
  return parsed.economy || parsed;
}

export async function getEconomyStore() {
  try {
    return normalizeEconomyStore(await readRemoteStore());
  } catch {}

  try {
    const parsed = JSON.parse(await readFile(fallbackFile(), "utf8"));
    return normalizeEconomyStore(parsed);
  } catch {}

  try {
    const parsed = JSON.parse(await readFile(contentFile(), "utf8"));
    return normalizeEconomyStore(parsed.economy || {});
  } catch {
    return normalizeEconomyStore();
  }
}

export async function saveEconomyStore(economy) {
  const normalized = compactEconomyStoreForWrite(normalizeEconomyStore(economy));

  try {
    return normalizeEconomyStore(await writeRemoteStore(normalized));
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  try {
    const file = contentFile();
    let content = {};
    try {
      content = JSON.parse(await readFile(file, "utf8"));
    } catch {}
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ ...content, economy: normalized }, null, 2));
    return normalized;
  } catch {}

  const file = fallbackFile();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(normalized, null, 2));
  return normalized;
}

export function getWallet(store, walletId) {
  return store.wallets.find((wallet) => wallet.id === walletId || wallet.userId === walletId || wallet.discordId === walletId);
}

function pushTransaction(store, transaction) {
  store.transactions = [
    {
      id: createId("txn"),
      taxAmount: 0,
      createdAt: new Date().toISOString(),
      createdBy: "system",
      ...transaction
    },
    ...(store.transactions || [])
  ].slice(0, 1000);
}

function addAlert(store, alert) {
  store.alerts = [
    {
      id: createId("economy-alert"),
      status: "open",
      createdAt: new Date().toISOString(),
      ...alert
    },
    ...(store.alerts || [])
  ].slice(0, 300);
}

function postMssAlert(store, wallet, alert) {
  const fine = Math.max(0, Number(alert.fine || 0));
  if (wallet) {
    wallet.underReview = true;
    wallet.bounty = Math.max(Number(wallet.bounty || 0), Number(alert.bounty || 0));
    wallet.wanted = Boolean(alert.wanted) || wallet.wanted;
    wallet.taxStatus = alert.taxStatus || wallet.taxStatus || "under MSS review";
  }
  addAlert(store, {
    severity: alert.severity || "high",
    type: alert.type || "financial_crime",
    walletId: wallet?.id || alert.walletId || "",
    summary: cleanText(alert.summary || "MSS financial crime review opened.", 500),
    fine,
    bounty: Math.max(0, Number(alert.bounty || 0)),
    action: alert.action || "investigate"
  });
}

function flagSuspiciousTransfer(store, transaction, fromWallet, toWallet) {
  const amount = Number(transaction.amount || 0);
  if (amount >= 10000) {
    addAlert(store, {
      severity: "high",
      type: "large_transfer",
      walletId: fromWallet?.id || toWallet?.id || "",
      transactionId: transaction.id,
      summary: `Large transfer of ${amount} PC requires MSS review.`
    });
  }
  if (toWallet?.underReview || toWallet?.linkedEnemyRecordId) {
    addAlert(store, {
      severity: "critical",
      type: "flagged_recipient",
      walletId: fromWallet?.id || "",
      transactionId: transaction.id,
      summary: `Payment to flagged wallet ${toWallet.displayName}.`
    });
  }
}

export async function createWallet(fields, actor = "system") {
  const store = await getEconomyStore();
  const now = new Date().toISOString();
  const wallet = {
    id: createId("wallet"),
    userId: cleanText(fields.userId || fields.displayName || createId("citizen"), 100).toLowerCase().replace(/\s+/g, "-"),
    discordId: cleanText(fields.discordId, 80),
    displayName: cleanText(fields.displayName || fields.userId || "Citizen Wallet", 120),
    balance: Math.max(0, Number(fields.balance || 0)),
    district: cleanText(fields.district, 80),
    title: cleanText(fields.title, 80),
    salary: Math.max(0, Number(fields.salary ?? 125)),
    status: walletStatuses.includes(fields.status) ? fields.status : "active",
    taxStatus: cleanText(fields.taxStatus || "compliant", 80),
    exempt: Boolean(fields.exempt),
    underReview: Boolean(fields.underReview),
    linkedEnemyRecordId: cleanText(fields.linkedEnemyRecordId, 120),
    createdAt: now,
    updatedAt: now
  };
  store.wallets = [wallet, ...store.wallets];
  pushTransaction(store, {
    fromWalletId: "treasury",
    toWalletId: wallet.id,
    amount: wallet.balance,
    type: "wallet_created",
    reason: "Wallet created by Ministry of Credit & Records",
    createdBy: actor
  });
  return saveEconomyStore(store);
}

export async function transferCredits({ fromWalletId, toWalletId, amount, reason, type = "transfer", actor = "citizen" }) {
  const store = await getEconomyStore();
  const fromWallet = getWallet(store, fromWalletId);
  const toWallet = getWallet(store, toWalletId);
  const numericAmount = Math.max(0, Number(amount || 0));

  if (!fromWallet) return { ok: false, store, reason: "wallet-missing" };
  if (!toWallet) return { ok: false, store, reason: "recipient-not-found" };
  if (fromWallet.id === toWallet.id) return { ok: false, store, reason: "same-wallet" };
  if (numericAmount <= 0) return { ok: false, store, reason: "invalid-amount" };
  if (fromWallet.status !== "active") return { ok: false, store, reason: "wallet-status" };
  if (toWallet.status === "frozen") return { ok: false, store, reason: "recipient-frozen" };
  if (fromWallet.balance < numericAmount) return { ok: false, store, reason: "insufficient-balance" };

  const rate = Number(store.taxRates.trade_tax || 0);
  const taxAmount = type === "transfer" && !fromWallet.exempt ? Math.round(numericAmount * rate * 100) / 100 : 0;
  const totalDebit = numericAmount + taxAmount;
  if (fromWallet.balance < totalDebit) {
    return { ok: false, store, reason: "insufficient-balance" };
  }

  fromWallet.balance -= totalDebit;
  fromWallet.updatedAt = new Date().toISOString();
  toWallet.balance += numericAmount;
  toWallet.updatedAt = new Date().toISOString();
  const transaction = {
    fromWalletId: fromWallet.id,
    toWalletId: toWallet.id,
    amount: numericAmount,
    type,
    reason: cleanText(reason || "Citizen transfer", 500),
    taxAmount,
    createdBy: actor
  };
  pushTransaction(store, transaction);
  if (taxAmount) {
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: fromWallet.id,
      taxType: "trade_tax",
      amount: taxAmount,
      rate,
      status: "paid",
      createdAt: new Date().toISOString()
    });
  }
  flagSuspiciousTransfer(store, transaction, fromWallet, toWallet);
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function treasuryPayment({ walletId, amount, reason, type = "grant", actor = "treasury" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const numericAmount = Math.max(0, Number(amount || 0));
  if (!wallet || numericAmount <= 0) {
    return { ok: false, store };
  }
  wallet.balance += numericAmount;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: "treasury",
    toWalletId: wallet.id,
    amount: numericAmount,
    type,
    reason: cleanText(reason || "State payment", 500),
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function claimDailyReward({ walletId, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const today = new Date().toISOString().slice(0, 10);
  if (!wallet || wallet.status !== "active") return { ok: false, store };
  ensureWalletCollections(wallet);
  if (wallet.loginDays.includes(today)) return { ok: false, store, reason: "daily-limit" };

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  wallet.streak = wallet.loginDays.includes(yesterday) ? wallet.streak + 1 : 1;
  wallet.loginDays = [today, ...wallet.loginDays.filter((day) => day !== today)].slice(0, 21);

  const base = Math.max(50, Number(wallet.salary ?? 125));
  const streakBonus = Math.min(250, wallet.streak * 10);
  const weeklyBonus = wallet.streak > 0 && wallet.streak % 7 === 0 ? 500 : 0;
  const randomBonus = Math.random() < 0.16 ? randomInt(25, 175) : 0;
  const amount = Math.round((base + streakBonus + weeklyBonus + randomBonus) * eventMultiplier(store, "rewardMultiplier", 1));
  wallet.balance += amount;
  wallet.updatedAt = new Date().toISOString();

  pushTransaction(store, {
    fromWalletId: "treasury",
    toWalletId: wallet.id,
    amount,
    type: "daily_stipend",
    reason: `Daily Civic Payment. Streak ${wallet.streak}${weeklyBonus ? " / 7-day loyalty bonus" : ""}${randomBonus ? " / random state bonus" : ""}.`,
    createdBy: actor,
    meta: { key: "daily", streak: wallet.streak, weeklyBonus, randomBonus, eventId: activeEvent(store)?.id }
  });
  return { ok: true, amount, streak: wallet.streak, store: await saveEconomyStore(store) };
}

export async function performEconomyJob({ walletId, jobId, actor = "citizen", district = "" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const selectedJobId = jobId || wallet?.selectedJobId || "work-shift";
  const job = economyJobDefaults.find((entry) => entry.id === selectedJobId) || economyJobDefaults[0];
  if (!wallet || wallet.status !== "active") return { ok: false, store };
  if (!isCooldownReady(store, wallet.id, "work", job.id, job.cooldownHours)) return { ok: false, store, reason: "cooldown" };
  ensureWalletCollections(wallet);
  const jobWallet = district ? { ...wallet, district } : wallet;
  const jobAccess = jobAccessForWallet(jobWallet, job);
  if (!jobAccess.allowed) return { ok: false, store, reason: jobAccess.reason || "job-restricted", message: jobAccess.message, job, jobAccess };
  const economyDistrict = store.districts.find((entry) => entry.name === (jobAccess.native ? jobWallet.district : job.district)) || store.districts.find((entry) => entry.name === jobWallet.district);
  const districtFit = jobAccess.native ? 1.18 : jobAccess.rewardMultiplier;
  const prosperity = 1 + (Number(economyDistrict?.prosperityRating || 70) - 70) / 300;
  const event = activeEvent(store);
  const eventBoost = event?.boostedDistricts?.includes(wallet.district) ? 1.2 : 1;
  const jobEventBoost = 1 + activeModifierSum(store, (entry) => eventAffectsDistrict(entry, job.district), "jobPayoutPercent");
  const riskEventBoost = activeModifierSum(store, (entry) => eventAffectsDistrict(entry, job.district), "riskPercent");
  const failed = Math.random() < clampNumber(Number(job.failureChance || 0) + riskEventBoost + jobAccess.riskModifier, 0, 0.85);
  const illegalOffer = Math.random() < Number(job.illegalOpportunityChance || 0);
  let amount = Math.round(randomInt(job.minReward, job.maxReward) * districtFit * prosperity * eventBoost * eventMultiplier(store, "workMultiplier", 1) * jobEventBoost);
  let penalty = 0;
  let itemReward = null;
  if (failed) {
    penalty = Math.max(15, Math.round(amount * (job.riskLevel === "High" || job.riskLevel === "Restricted" ? 0.45 : job.riskLevel === "Medium" ? 0.28 : 0.15)));
    const previousBalance = Number(wallet.balance || 0);
    wallet.balance = Math.max(-1000, previousBalance - penalty);
    wallet.debt = Math.max(0, Number(wallet.debt || 0) + Math.max(0, penalty - previousBalance));
    amount = 0;
    if (job.riskLevel === "High" || job.riskLevel === "Restricted" || illegalOffer) {
      postMssAlert(store, wallet, {
        severity: job.riskLevel === "Restricted" ? "critical" : "high",
        type: "job_risk",
        fine: penalty,
        summary: `MSS Labour Risk Alert: ${wallet.displayName} triggered a ${job.name} failure.`
      });
    }
  } else {
    wallet.balance += amount;
    wallet.jobXp = Math.max(0, Number(wallet.jobXp || 0) + Math.max(8, Math.round(amount / 12)));
    wallet.jobLevel = levelForXp(wallet.jobXp);
    if (Array.isArray(job.itemRewards) && job.itemRewards.length && Math.random() < 0.22) {
      itemReward = getInventoryItem(job.itemRewards[Math.floor(Math.random() * job.itemRewards.length)]);
      if (itemReward) addHolding(wallet, itemReward.id, 1, itemValue(itemReward, store), job.name);
    }
    if (illegalOffer) {
      const bonus = Math.round(amount * 0.22);
      wallet.balance += bonus;
      amount += bonus;
      postMssAlert(store, wallet, {
        severity: "medium",
        type: "illegal_job_opportunity",
        fine: Math.round(bonus * 0.5),
        summary: `MSS Labour Notice: ${wallet.displayName} encountered a suspicious opportunity during ${job.name}.`
      });
    }
  }
  wallet.updatedAt = new Date().toISOString();
  if (economyDistrict) {
    economyDistrict.tradeVolume = Math.round(Number(economyDistrict.tradeVolume || 0) + Math.max(1, amount) * 1.6);
    economyDistrict.taxContribution = Math.round(Number(economyDistrict.taxContribution || 0) + amount * 0.08);
    economyDistrict.supplyLevel = clampNumber(Number(economyDistrict.supplyLevel || 0) + (failed ? -1 : 1), 0, 130);
  }
  pushTransaction(store, {
    fromWalletId: failed ? wallet.id : "district-production",
    toWalletId: failed ? "treasury" : wallet.id,
    amount: failed ? penalty : amount,
    type: "work",
    reason: `${job.name}: ${failed ? "failed assignment" : job.description}${itemReward ? ` / item: ${itemReward.name}` : ""}${jobAccess.native ? "" : " / foreign work penalty applied"}`,
    createdBy: actor,
    meta: { key: job.id, district: jobWallet.district, jobDistrict: job.district, eventId: event?.id, failed, riskLevel: job.riskLevel, illegalOffer, itemRewardId: itemReward?.id || "", nativeDistrict: jobAccess.native, rewardMultiplier: jobAccess.rewardMultiplier, riskModifier: jobAccess.riskModifier }
  });
  return { ok: true, amount, penalty, failed, job, itemReward, illegalOffer, jobAccess, store: await saveEconomyStore(store) };
}

export async function setCitizenJob({ walletId, jobId, actor = "citizen", district = "" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const job = economyJobDefaults.find((entry) => entry.id === jobId);
  if (!wallet || !job || wallet.status !== "active") return { ok: false, store, reason: "job" };
  ensureWalletCollections(wallet);
  const jobWallet = district ? { ...wallet, district } : wallet;
  const jobAccess = jobAccessForWallet(jobWallet, job);
  if (!jobAccess.allowed) {
    return { ok: false, store, reason: jobAccess.reason || "job-restricted", message: jobAccess.message, job, jobAccess };
  }
  if (wallet.jobChangedAt && Date.now() - Date.parse(wallet.jobChangedAt) < Number(job.switchCooldownHours || 24) * 60 * 60 * 1000) {
    return { ok: false, store, reason: "job-cooldown" };
  }
  wallet.selectedJobId = job.id;
  wallet.jobChangedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "labour-registry",
    amount: 0,
    type: "set_job",
    reason: `${wallet.displayName} selected ${job.name}.`,
    createdBy: actor,
    meta: { key: job.id, district: jobWallet.district }
  });
  return { ok: true, job, store: await saveEconomyStore(store) };
}

export async function grantWorkPermit({
  walletId,
  citizenId = "",
  citizenName = "",
  targetDistrict = "",
  jobId = "",
  requestId = "",
  approvedBy = "District Administration",
  durationDays = 30
}) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const job = economyJobDefaults.find((entry) => entry.id === jobId);
  const cleanTargetDistrict = cleanText(targetDistrict, 80);
  if (!wallet || !cleanTargetDistrict) return { ok: false, reason: "wallet", store };
  ensureWalletCollections(wallet);
  wallet.workPermits = Array.isArray(wallet.workPermits) ? wallet.workPermits : [];
  const now = new Date();
  const permit = {
    id: createId("permit"),
    citizenId: cleanText(citizenId, 120),
    citizenName: cleanText(citizenName || wallet.displayName, 160),
    walletId: wallet.id,
    targetDistrict: normalizeEconomyDistrict(cleanTargetDistrict),
    jobId: cleanText(jobId, 120),
    jobName: cleanText(job?.name || "All district jobs", 160),
    status: "approved",
    approvedBy: cleanText(approvedBy, 160),
    requestId: cleanText(requestId, 120),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + Math.max(1, Number(durationDays || 30)) * 24 * 60 * 60 * 1000).toISOString()
  };
  wallet.workPermits = [
    permit,
    ...wallet.workPermits.filter((entry) =>
      !(entry.targetDistrict === permit.targetDistrict && String(entry.jobId || "") === String(permit.jobId || "") && entry.status === "approved")
    )
  ].slice(0, 25);
  wallet.updatedAt = now.toISOString();
  pushTransaction(store, {
    fromWalletId: "labour-registry",
    toWalletId: wallet.id,
    amount: 0,
    type: "work_permit",
    reason: `${permit.targetDistrict} work permit approved${permit.jobName ? ` / ${permit.jobName}` : ""}.`,
    createdBy: approvedBy,
    meta: { permitId: permit.id, requestId, targetDistrict: permit.targetDistrict, jobId: permit.jobId }
  });
  return { ok: true, permit, store: await saveEconomyStore(store) };
}

export async function performCrimeAction({ walletId, crimeId, targetWalletId = "", actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const target = targetWalletId ? getWallet(store, targetWalletId) : null;
  const crime = economyCrimeDefaults.find((entry) => entry.id === crimeId) || economyCrimeDefaults[0];
  if (!wallet || wallet.status !== "active") return { ok: false, store };
  if (!isCooldownReady(store, wallet.id, "crime", crime.id, crime.cooldownHours)) return { ok: false, store, reason: "cooldown" };

  const event = activeEvent(store);
  const success = Math.random() < Number(crime.successChance || 0);
  const detectionChance = clampNumber(Number(crime.detectionChance || 0) + Number(event?.crimeDetectionBonus || 0), 0, 0.95);
  const detected = !success || Math.random() < detectionChance;
  let amount = 0;
  let penalty = 0;
  let stolenItem = null;

  if (success) {
    amount = randomInt(crime.minReward, crime.maxReward);
    if (target) {
      const stolen = Math.min(amount, Math.max(0, Number(target.balance || 0)));
      target.balance -= stolen;
      amount = stolen;
      target.updatedAt = new Date().toISOString();
    }
    if (target && Array.isArray(target.holdings) && target.holdings.length && Math.random() < 0.35) {
      const candidates = target.holdings.filter((holding) => Number(holding.quantity || 0) > 0);
      const holding = candidates[randomInt(0, Math.max(0, candidates.length - 1))];
      if (holding && removeHolding(target, holding.itemId, 1)) {
        stolenItem = getInventoryItem(holding.itemId);
        addHolding(wallet, holding.itemId, 1, itemValue(stolenItem, store), "Robbery");
      }
    }
    wallet.balance += amount;
  } else {
    penalty = Math.round(Number(crime.penalty || 0) * Number(event?.crimePenaltyMultiplier || 1));
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - penalty);
    wallet.seizedCredits = Number(wallet.seizedCredits || 0) + penalty;
    if (Math.random() < 0.25) {
      const lostItemId = loseRandomHolding(wallet);
      stolenItem = lostItemId ? getInventoryItem(lostItemId) : null;
    }
  }

  wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + (detected ? 16 : 7));
  wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: success ? (target?.id || "black-market") : wallet.id,
    toWalletId: success ? wallet.id : "treasury",
    amount: success ? amount : penalty,
    type: "crime",
    reason: `${crime.name}: ${success ? "successful" : "failed"} fictional operation${stolenItem ? ` / item: ${stolenItem.name}` : ""}.`,
    createdBy: actor,
    meta: { key: crime.id, success, detected, targetWalletId: target?.id || "", eventId: event?.id, stolenItemId: stolenItem?.id || "" }
  });

  if (detected) {
    const bounty = Math.round((success ? amount : penalty || crime.penalty) * 0.75);
    postMssAlert(store, wallet, {
      severity: success ? "high" : "critical",
      type: crime.id,
      fine: Math.max(25, Math.round((penalty || amount || crime.penalty) * 0.8)),
      bounty,
      wanted: ["rob-citizen", "counterfeit-credits", "hack-treasury-terminal"].includes(crime.id),
      summary: `MSS Financial Crime Alert: ${wallet.displayName} triggered ${crime.name}. Outcome: ${success ? "profit" : "failure"} / ${success ? amount : penalty} PC.`
    });
  }

  return { ok: true, amount, penalty, success, detected, crime, stolenItem, store: await saveEconomyStore(store) };
}

function districtEnforcementProfile(districtName = "") {
  if (districtName === "The Capitol" || districtName === "Capitol") return { taxModifier: 0.06, detectionModifier: 0.16, activityModifier: -0.08, label: "Capitol enforcement" };
  const districtNumber = Number(String(districtName).replace(/\D/g, "")) || 0;
  if (districtNumber && districtNumber <= 3) return { taxModifier: 0.03, detectionModifier: 0.08, activityModifier: 0.02, label: "Priority district watch" };
  return { taxModifier: -0.02, detectionModifier: -0.06, activityModifier: 0.12, label: "District underground" };
}

export function getBlackMarketDashboard(store, wallet) {
  const profile = districtEnforcementProfile(wallet?.district || "");
  const goods = (store.blackMarketGoods || blackMarketGoodsDefaults).map((good) => ({
    ...good,
    detectionChance: clampNumber(Number(good.detectionChance || 0.35) + profile.detectionModifier, 0.08, 0.88),
    price: Math.max(1, Math.round(Number(good.price || 1) * (1 + (profile.activityModifier * -0.6)))),
    enforcementLabel: profile.label
  }));
  return {
    goods,
    profile,
    smugglingRoutes: (store.districts || []).filter((district) => district.name !== wallet?.district).slice(0, 8),
    suspicion: wallet ? calculateWalletSuspicion(store, wallet) : { score: 0, status: "Unknown", reasons: [] }
  };
}

export async function buyBlackMarketGood({ walletId, goodId, quantity = 1, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const good = (store.blackMarketGoods || blackMarketGoodsDefaults).find((entry) => entry.id === goodId);
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!wallet || wallet.status !== "active" || !good || Number(good.stock || 0) < count) return { ok: false, store };
  const profile = districtEnforcementProfile(wallet.district);
  const price = Math.max(1, Math.round(Number(good.price || 1) * count * (1 + (profile.activityModifier * -0.6))));
  if (Number(wallet.balance || 0) < price) return { ok: false, store };
  const detected = Math.random() < clampNumber(Number(good.detectionChance || 0.35) + profile.detectionModifier, 0.08, 0.88);
  wallet.balance -= price;
  addHolding(wallet, good.id, count, Math.round(price / count), "Black Market");
  good.stock = Math.max(0, Number(good.stock || 0) - count);
  wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + (detected ? 22 : 10));
  wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "black-market",
    amount: price,
    type: "black-market",
    reason: `${count} x ${good.name}`,
    createdBy: actor,
    meta: { key: good.id, detected, detectionChance: good.detectionChance, district: wallet.district }
  });
  if (detected) {
    postMssAlert(store, wallet, {
      severity: "critical",
      type: "black_market_trade",
      fine: Math.round(price * 0.55),
      bounty: Math.round(price * 0.35),
      summary: `MSS Black Market Alert: ${wallet.displayName} bought ${good.name}.`
    });
  }
  return { ok: true, good, quantity: count, price, detected, store: await saveEconomyStore(store) };
}

export async function runSmugglingDeal({ walletId, itemId, quantity = 1, destinationDistrict = "", actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const item = getInventoryItem(itemId);
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!wallet || wallet.status !== "active" || !item || !destinationDistrict || !removeHolding(wallet, item.id, count)) return { ok: false, store };
  const originProfile = districtEnforcementProfile(wallet.district);
  const destinationProfile = districtEnforcementProfile(destinationDistrict);
  const risk = clampNumber(0.24 + originProfile.detectionModifier + destinationProfile.detectionModifier + (item.contraband ? 0.2 : 0), 0.08, 0.9);
  const success = Math.random() >= risk;
  const reward = Math.round(itemValue(item, store) * count * (success ? 1.8 : 0));
  const fine = success ? 0 : Math.round(itemValue(item, store) * count * 0.85);
  if (success) {
    wallet.balance += reward;
    const district = store.districts.find((entry) => entry.name === destinationDistrict);
    if (district) {
      district.demandLevel = clampNumber(Number(district.demandLevel || 0) + 4, 0, 140);
      district.tradeVolume = Math.round(Number(district.tradeVolume || 0) + reward);
    }
  } else {
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - fine);
    wallet.seizedCredits = Number(wallet.seizedCredits || 0) + fine;
    postMssAlert(store, wallet, {
      severity: "critical",
      type: "smuggling",
      fine,
      bounty: Math.round(fine * 0.45),
      summary: `MSS Smuggling Intercept: ${wallet.displayName} lost ${count} x ${item.name} en route to ${destinationDistrict}.`
    });
  }
  wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + (success ? 12 : 24));
  wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: success ? "black-market-buyer" : "mss-seizure",
    amount: success ? reward : fine,
    type: "smuggling",
    reason: `${success ? "Delivered" : "Intercepted"} ${count} x ${item.name} to ${destinationDistrict}`,
    createdBy: actor,
    meta: { key: item.id, destinationDistrict, success, risk }
  });
  return { ok: true, item, quantity: count, success, reward, fine, risk, store: await saveEconomyStore(store) };
}

export async function playGambleGame({ walletId, gameId, amount, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const game = economyGambleDefaults.find((entry) => entry.id === gameId) || economyGambleDefaults[0];
  const bet = clampNumber(amount, game.minBet, game.maxBet);
  if (!wallet) return { ok: false, store, reason: "wallet-missing" };
  if (wallet.status !== "active") return { ok: false, store, reason: "wallet-status" };
  if (Number(wallet.balance || 0) < bet) return { ok: false, store, reason: "insufficient-balance", bet, game };
  if (!isCooldownReady(store, wallet.id, "gamble", game.id, game.cooldownHours)) {
    return { ok: false, store, reason: "gamble-cooldown", game };
  }
  const won = Math.random() < Number(game.winChance || 0);
  const taxRate = Number(store.taxRates.gambling_winnings_tax || 0.08);
  const grossPayout = won ? Math.round(bet * Number(game.payoutMultiplier || 1)) : 0;
  const winningsTax = won ? Math.round(Math.max(0, grossPayout - bet) * taxRate * 100) / 100 : 0;
  const payout = Math.max(0, grossPayout - winningsTax);
  wallet.balance = Math.max(0, Number(wallet.balance || 0) - bet + payout);
  if (bet >= 750 || (won && grossPayout >= 1500)) {
    wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + (won ? 5 : 3));
  }
  const suspicion = calculateWalletSuspicion(store, wallet);
  wallet.suspicionLevel = suspicion.score;
  wallet.securityStatus = suspicion.status;
  wallet.updatedAt = new Date().toISOString();
  store.gamblingJackpot = Math.max(500, Number(store.gamblingJackpot || 2500) + Math.round(bet * 0.08) - (game.id === "district-lottery" && won ? Math.round(grossPayout * 0.2) : 0));
  pushTransaction(store, {
    fromWalletId: won ? "capitol-games" : wallet.id,
    toWalletId: won ? wallet.id : "capitol-games",
    amount: won ? payout : bet,
    type: "gamble",
    reason: `${game.name}: ${won ? "payout" : "loss"} on ${bet} PC bet.`,
    taxAmount: winningsTax,
    createdBy: actor,
    meta: { key: game.id, bet, won, grossPayout, winningsTax, suspicion: suspicion.score }
  });
  if (wallet.suspicionLevel >= 70) {
    postMssAlert(store, wallet, {
      severity: wallet.suspicionLevel >= 85 ? "critical" : "high",
      type: "excessive_gambling",
      summary: `${wallet.displayName} reached ${wallet.securityStatus} gambling suspicion after ${game.name}.`,
      action: "monitor"
    });
  }
  return { ok: true, won, bet, payout, game, store: await saveEconomyStore(store) };
}

export async function investInFund({ walletId, fundId, amount, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const fund = investmentFundDefaults.find((entry) => entry.id === fundId) || investmentFundDefaults[0];
  const stake = Math.max(25, Number(amount || 0));
  if (!wallet || wallet.status !== "active" || Number(wallet.balance || 0) < stake) return { ok: false, store };
  ensureWalletCollections(wallet);
  const lost = Math.random() < Number(fund.lossChance || 0);
  const rate = lost ? -randomInt(2, 18) / 100 : Number(fund.minReturn) + Math.random() * (Number(fund.maxReturn) - Number(fund.minReturn));
  const returnAmount = Math.round(stake * rate);
  wallet.balance = Math.max(0, Number(wallet.balance || 0) - stake + stake + returnAmount);
  wallet.investments.unshift({
    id: createId("investment"),
    fundId: fund.id,
    amount: stake,
    returnAmount,
    riskLevel: fund.riskLevel,
    createdAt: new Date().toISOString()
  });
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: returnAmount >= 0 ? fund.id : wallet.id,
    toWalletId: returnAmount >= 0 ? wallet.id : fund.id,
    amount: Math.abs(returnAmount),
    type: "investment",
    reason: `${fund.name}: ${returnAmount >= 0 ? "return" : "loss"} on ${stake} PC allocation.`,
    createdBy: actor,
    meta: { key: fund.id, stake, returnAmount }
  });
  return { ok: true, fund, stake, returnAmount, store: await saveEconomyStore(store) };
}

export async function buyPrestigeItem({ walletId, itemId, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const item = prestigeItemDefaults.find((entry) => entry.id === itemId) || prestigeItemDefaults[0];
  if (!wallet || wallet.status !== "active" || Number(wallet.balance || 0) < Number(item.price || 0)) return { ok: false, store };
  ensureWalletCollections(wallet);
  if (wallet.properties.some((owned) => owned.itemId === item.id)) return { ok: false, store, reason: "owned" };
  wallet.balance -= Number(item.price || 0);
  wallet.title = item.title;
  wallet.properties.unshift({ itemId: item.id, name: item.name, passiveIncome: item.passiveIncome, createdAt: new Date().toISOString() });
  wallet.badges = [...new Set([item.title, ...wallet.badges])].slice(0, 8);
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "prestige-registry",
    amount: item.price,
    type: "prestige_purchase",
    reason: `${item.name}: ${item.benefit}`,
    createdBy: actor,
    meta: { key: item.id }
  });
  return { ok: true, item, store: await saveEconomyStore(store) };
}

export async function gatherInventoryItem({ walletId, actionId, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const action = gatheringActionDefaults.find((entry) => entry.id === actionId || entry.command === actionId) || gatheringActionDefaults[0];
  if (!wallet || wallet.status !== "active") return { ok: false, store };
  ensureWalletCollections(wallet);
  if (hasActionBan(wallet, action.id)) return { ok: false, store, reason: "action-ban" };
  if (!isCooldownReady(store, wallet.id, "gather", action.id, action.cooldownHours)) return { ok: false, store, reason: "cooldown" };
  if (occupiedInventorySlots(wallet) >= wallet.inventorySlots) return { ok: false, store, reason: "inventory-full" };

  const success = Math.random() < Number(action.successChance || 0);
  const risk = rollRisk(action);
  let drop = success ? rollDrop(action) : null;
  let item = drop ? getInventoryItem(drop.itemId) : null;
  let quantity = drop ? randomInt(drop.minQuantity || 1, drop.maxQuantity || 1) : 0;
  let creditPenalty = 0;
  let lostItemId = "";
  let cooldownPenaltyHours = 0;

  if (risk) {
    creditPenalty = Math.max(0, Number(risk.creditPenalty || 0));
    const previousBalance = Number(wallet.balance || 0);
    wallet.balance = Math.max(-1000, previousBalance - creditPenalty);
    wallet.debt = Math.max(0, Number(wallet.debt || 0) + Math.max(0, creditPenalty - previousBalance));
    cooldownPenaltyHours = Math.max(0, Number(risk.cooldownPenaltyHours || 0));
    if (cooldownPenaltyHours) {
      wallet.actionBans.unshift({
        actionId: action.id,
        reason: risk.label,
        until: new Date(Date.now() + cooldownPenaltyHours * 60 * 60 * 1000).toISOString()
      });
    }
    if (risk.loseItem) lostItemId = loseRandomHolding(wallet) || "";
    if (risk.mssAlert) {
      wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + 10);
      postMssAlert(store, wallet, {
        severity: "high",
        type: "inventory_risk",
        fine: creditPenalty,
        summary: `MSS Inventory Alert: ${wallet.displayName} triggered ${risk.label} during ${action.name}.`
      });
    }
  }

  if (item && quantity > 0) {
    addHolding(wallet, item.id, quantity, itemValue(item, store), action.name);
    wallet.collectionScore += Math.round(quantity * rarityMultiplier(itemRarity(item)) * 10);
    if (["epic", "legendary"].includes(itemRarity(item))) {
      const achievement = itemRarity(item) === "legendary" ? "Legendary Find" : "Epic Discovery";
      wallet.achievements = [...new Set([achievement, ...(wallet.achievements || [])])].slice(0, 20);
      store.marketNotices = [
        {
          id: createId("notice"),
          title: `${itemRarity(item) === "legendary" ? "Legendary" : "Rare"} Find Recorded`,
          body: `${wallet.displayName} discovered ${item.name} through ${action.name}.`,
          severity: itemRarity(item) === "legendary" ? "high" : "medium",
          createdAt: new Date().toISOString()
        },
        ...(store.marketNotices || [])
      ].slice(0, 20);
    }
    if (item.contraband) {
      wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + 18);
      postMssAlert(store, wallet, {
        severity: "critical",
        type: "contraband_inventory",
        fine: Math.round(itemValue(item, store) * 0.2),
        wanted: false,
        summary: `Restricted inventory detected: ${wallet.displayName} acquired ${item.name}.`
      });
      wallet.inventoryFlags.unshift({ itemId: item.id, reason: "Restricted acquisition", createdAt: new Date().toISOString() });
    }
  }

  const suspicion = calculateWalletSuspicion(store, wallet);
  wallet.suspicionLevel = suspicion.score;
  wallet.securityStatus = suspicion.status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: action.district,
    toWalletId: wallet.id,
    amount: item ? itemValue(item, store) * quantity : creditPenalty,
    type: "gather",
    reason: item ? `${action.name}: ${quantity} x ${item.name}` : `${action.name}: ${action.failureText}`,
    createdBy: actor,
    meta: { key: action.id, itemId: item?.id || "", quantity, rarity: itemRarity(item), riskId: risk?.id || "", lostItemId }
  });

  return { ok: true, action, success: Boolean(item), item, quantity, risk, creditPenalty, lostItemId, store: await saveEconomyStore(store) };
}

export async function sellInventoryToState({ walletId, itemId, quantity, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const item = getInventoryItem(itemId);
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!wallet || !item || wallet.status !== "active" || !removeHolding(wallet, item.id, count)) return { ok: false, store };
  const value = itemValue(item, store) * count;
  const taxRate = 0.05;
  const taxAmount = Math.round(value * taxRate * 100) / 100;
  wallet.balance += Math.max(0, value - taxAmount);
  wallet.suspicionLevel = Math.max(0, Number(wallet.suspicionLevel || 0) - 2);
  wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: "state-procurement",
    toWalletId: wallet.id,
    amount: Math.max(0, value - taxAmount),
    type: "inventory_sell",
    reason: `${count} x ${item.name} sold to state. Inventory tax ${Math.round(taxRate * 100)}%.`,
    taxAmount,
    createdBy: actor,
    meta: { key: item.id, quantity: count, rarity: itemRarity(item) }
  });
  if (taxAmount) {
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: wallet.id,
      taxType: "inventory_tax",
      amount: taxAmount,
      rate: taxRate,
      status: "paid",
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true, item, quantity: count, value, store: await saveEconomyStore(store) };
}

export async function openInventoryCrate({ walletId, actor = "citizen", crateId = "standard" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const crate = getLootboxCrate(crateId);
  const cost = Number(crate.price || 250);
  if (!wallet) return { ok: false, store, reason: "wallet" };
  if (wallet.status !== "active") return { ok: false, store, reason: "wallet-status" };
  ensureWalletCollections(wallet);
  resetLootboxAllocation(store);
  const userOpened = Number(store.perUserLootboxesOpenedToday[wallet.id] || 0);
  if (Number(store.globalLootboxesOpenedToday || 0) >= lootboxDailyGlobalLimit || userOpened >= lootboxDailyUserLimit) {
    return { ok: false, store, reason: "crate-allocation" };
  }
  if (Number(wallet.balance || 0) < cost) return { ok: false, store, reason: "balance" };
  if (occupiedInventorySlots(wallet) >= wallet.inventorySlots) return { ok: false, store, reason: "inventory-full" };
  wallet.balance -= cost;
  const { item, quantity, rarity, lowRoll, taxPenalty } = rollLootboxReward(store, crate);
  if (taxPenalty) {
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - taxPenalty);
  }
  addHolding(wallet, item.id, quantity, itemValue(item, store), "Lucky Crate");
  wallet.collectionScore += Math.round(quantity * rarityMultiplier(rarity) * 10);
  store.globalLootboxesOpenedToday = Number(store.globalLootboxesOpenedToday || 0) + 1;
  store.perUserLootboxesOpenedToday[wallet.id] = userOpened + 1;
  store.lootboxLogs = [{
    id: createId("crate"),
    date: store.lootboxAllocationDate,
    userId: wallet.userId || wallet.discordId || wallet.id,
    walletId: wallet.id,
    crateId: crate.id,
    rewardItemId: item.id,
    rewardName: item.name,
    rarity,
    quantity,
    cost,
    taxPenalty,
    lowRoll,
    createdAt: new Date().toISOString()
  }, ...(store.lootboxLogs || [])].slice(0, 300);
  pushTransaction(store, {
    fromWalletId: "lucky-crate",
    toWalletId: wallet.id,
    amount: itemValue(item, store) * quantity,
    type: "lootbox",
    reason: `${crate.label}: ${quantity} x ${item.name}${lowRoll ? " / low roll" : ""}${taxPenalty ? ` / ${taxPenalty} PC penalty` : ""}`,
    createdBy: actor,
    meta: { key: item.id, rarity, quantity, crateId: crate.id, cost, taxPenalty, lowRoll }
  });
  return {
    ok: true,
    item,
    quantity,
    cost,
    crate,
    rarity,
    lowRoll,
    taxPenalty,
    remainingGlobal: Math.max(0, lootboxDailyGlobalLimit - Number(store.globalLootboxesOpenedToday || 0)),
    remainingUser: Math.max(0, lootboxDailyUserLimit - Number(store.perUserLootboxesOpenedToday[wallet.id] || 0)),
    store: await saveEconomyStore(store)
  };
}

export async function craftInventoryItem({ walletId, recipeId, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const recipe = (store.craftingRecipes || craftingRecipeDefaults).find((entry) => entry.id === recipeId || entry.outputItemId === recipeId);
  if (!wallet || wallet.status !== "active" || !recipe) return { ok: false, store, reason: "recipe" };
  ensureWalletCollections(wallet);
  if (Number(wallet.craftingLevel || 1) < Number(recipe.unlockLevel || 1)) return { ok: false, store, reason: "level" };
  if (!hasMaterials(wallet, recipe.materials)) return { ok: false, store, reason: "materials" };

  const specialist = recipeDistrictMatch(wallet, recipe);
  const levelBonus = Math.min(0.16, (Number(wallet.craftingLevel || 1) - 1) * 0.018);
  const successChance = clampNumber(Number(recipe.successChance || 0.7) + levelBonus + (specialist ? 0.2 : -0.15), 0.12, 0.96);
  const critical = Math.random() < Math.max(0.02, Number(wallet.craftingLevel || 1) * 0.006 + (specialist ? 0.03 : 0));
  const success = Math.random() < successChance;
  const outputItem = getInventoryItem(recipe.outputItemId);
  const consumed = consumeMaterials(wallet, recipe.materials, !success);
  let quality = null;
  let outputQuantity = 0;

  wallet.craftingXp = Math.max(0, Number(wallet.craftingXp || 0) + Number(recipe.xpReward || 35));
  wallet.craftingLevel = levelForXp(wallet.craftingXp);
  if (success && outputItem) {
    quality = rollCraftQuality(wallet.craftingLevel, specialist);
    outputQuantity = Math.max(1, Number(recipe.outputQuantity || 1) + (critical ? 1 : 0));
    addHolding(wallet, outputItem.id, outputQuantity, Math.round(itemValue(outputItem, store) * Number(quality.valueMultiplier || 1)), `Crafting: ${recipe.name}`);
    const holding = wallet.holdings.find((entry) => entry.itemId === outputItem.id);
    if (holding) {
      holding.quality = quality.label;
      holding.qualityMultiplier = quality.valueMultiplier;
      holding.craftedAt = new Date().toISOString();
    }
  }

  const district = store.districts.find((entry) => entry.name === recipe.district);
  if (district) {
    district.demandLevel = clampNumber(Number(district.demandLevel || 0) + recipe.materials.length + (success ? 1 : 2), 0, 140);
    district.supplyLevel = clampNumber(Number(district.supplyLevel || 0) + (success ? outputQuantity : -1), 0, 140);
    district.tradeVolume = Math.round(Number(district.tradeVolume || 0) + (outputItem ? itemValue(outputItem, store) * Math.max(1, outputQuantity) : 100));
  }
  for (const material of recipe.materials || []) {
    const marketItem = store.marketItems.find((entry) => entry.id === material.itemId);
    if (marketItem) marketItem.stock = Math.max(0, Number(marketItem.stock || 0) - Number(material.quantity || 1));
  }
  if (recipe.restricted || outputItem?.contraband) {
    wallet.suspicionLevel = Math.min(100, Number(wallet.suspicionLevel || 0) + 18);
    wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
    postMssAlert(store, wallet, {
      severity: "critical",
      type: "restricted_crafting",
      summary: `MSS Crafting Alert: ${wallet.displayName} attempted ${recipe.name}.`
    });
  }
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: success ? wallet.id : "crafting-loss",
    amount: success && outputItem ? itemValue(outputItem, store) * Math.max(1, outputQuantity) : 0,
    type: "crafting",
    reason: `${recipe.name}: ${success ? `crafted ${outputQuantity} ${outputItem?.name || "item"} (${quality?.label || "Standard"})` : "craft failed; materials lost"}`,
    createdBy: actor,
    meta: { key: recipe.id, outputItemId: recipe.outputItemId, success, critical, quality: quality?.id || "", specialist, consumed }
  });
  return { ok: true, recipe, outputItem, success, critical, quality, outputQuantity, successChance, specialist, store: await saveEconomyStore(store) };
}

export function getCraftingDashboard(store, wallet) {
  const normalizedWallet = wallet ? { ...wallet, holdings: Array.isArray(wallet.holdings) ? wallet.holdings.map((entry) => ({ ...entry })) : [] } : null;
  if (normalizedWallet) ensureWalletCollections(normalizedWallet);
  const recipes = (store.craftingRecipes || craftingRecipeDefaults).map((recipe) => {
    const specialist = recipeDistrictMatch(normalizedWallet, recipe);
    const level = Number(normalizedWallet?.craftingLevel || 1);
    const successChance = clampNumber(Number(recipe.successChance || 0.7) + Math.min(0.16, (level - 1) * 0.018) + (specialist ? 0.2 : -0.15), 0.12, 0.96);
    return {
      ...recipe,
      outputItem: getInventoryItem(recipe.outputItemId),
      specialist,
      successChance,
      unlocked: level >= Number(recipe.unlockLevel || 1),
      canCraft: Boolean(normalizedWallet && level >= Number(recipe.unlockLevel || 1) && hasMaterials(normalizedWallet, recipe.materials)),
      materials: (recipe.materials || []).map((material) => {
        const held = normalizedWallet?.holdings?.find((holding) => holding.itemId === material.itemId);
        return { ...material, item: getInventoryItem(material.itemId), held: Number(held?.quantity || 0) };
      })
    };
  });
  return {
    wallet: normalizedWallet,
    recipes,
    qualityTiers: craftingQualityTiers,
    craftingLevel: Number(normalizedWallet?.craftingLevel || 1),
    craftingXp: Number(normalizedWallet?.craftingXp || 0),
    jobLevel: Number(normalizedWallet?.jobLevel || 1),
    jobXp: Number(normalizedWallet?.jobXp || 0)
  };
}

export function getInventoryDashboard(store, wallet) {
  const normalizedWallet = wallet ? { ...wallet } : null;
  if (normalizedWallet) ensureWalletCollections(normalizedWallet);
  const holdings = (normalizedWallet?.holdings || []).map((holding) => {
    const item = getInventoryItem(holding.itemId) || { id: holding.itemId, name: holding.itemId, rarity: holding.rarity || "common", type: holding.type || "goods", baseValue: holding.averageCost || 1 };
    const qualityMultiplier = Number(holding.qualityMultiplier || 1);
    const value = Math.round(itemValue(item, store) * qualityMultiplier);
    return {
      ...holding,
      item,
      rarity: holding.rarity || itemRarity(item),
      value,
      totalValue: value * Number(holding.quantity || 0)
    };
  }).sort((a, b) => b.totalValue - a.totalValue);
  const totalWorth = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
  const rareLeaderboard = [...(store.wallets || [])].map((entry) => {
    ensureWalletCollections(entry);
    const score = entry.holdings.reduce((sum, holding) => {
      const item = getInventoryItem(holding.itemId);
      return sum + Number(holding.quantity || 0) * rarityMultiplier(holding.rarity || itemRarity(item));
    }, 0);
    return { wallet: entry, score };
  }).sort((a, b) => b.score - a.score).slice(0, 10);
  return {
    holdings,
    totalWorth,
    usedSlots: normalizedWallet ? occupiedInventorySlots(normalizedWallet) : 0,
    maxSlots: normalizedWallet?.inventorySlots || 0,
    rareLeaderboard,
    actions: gatheringActionDefaults,
    itemCatalog: inventoryItemDefaults
  };
}

function raidTargetWallets(store, { mode = "target", walletId = "", district = "" } = {}) {
  if (mode === "district") return (store.wallets || []).filter((wallet) => wallet.district === district);
  if (mode === "random") {
    const ranked = [...(store.wallets || [])].sort((a, b) => calculateWalletSuspicion(store, b).score - calculateWalletSuspicion(store, a).score);
    return ranked.length ? [ranked[0]] : [];
  }
  const wallet = getWallet(store, walletId);
  return wallet ? [wallet] : [];
}

export async function conductMssRaid({
  mode = "target",
  walletId = "",
  district = "",
  raidType = "Inventory Inspection",
  reason = "Suspicious activity",
  itemSeizurePercent = 25,
  fineAmount = 0,
  restrictHours = 0,
  actor = "mss"
}) {
  const store = await getEconomyStore();
  const targets = raidTargetWallets(store, { mode, walletId, district });
  const now = new Date().toISOString();
  const raidId = createId("raid");
  const logs = [];

  if (!targets.length) {
    return { ok: false, reason: "Raid failed: citizen record not found", raidId, logs, store };
  }

  for (const wallet of targets) {
    ensureWalletCollections(wallet);
    const suspicion = calculateWalletSuspicion(store, wallet);
    wallet.suspicionLevel = suspicion.score;
    wallet.securityStatus = suspicion.status;
    const seizedItems = [];
    const basePercent = Math.max(0, Math.min(100, Number(itemSeizurePercent || 0))) / 100;

    for (const holding of [...wallet.holdings]) {
      const item = getInventoryItem(holding.itemId);
      const quantity = Number(holding.quantity || 0);
      if (!item || quantity <= 0) continue;
      const raidWeight = raidType === "Full Asset Raid" ? Math.max(basePercent, itemRaidWeight(item)) : Math.max(basePercent * itemRaidWeight(item), item?.contraband ? 1 : 0);
      const seizedQuantity = item?.contraband ? quantity : Math.min(quantity, Math.floor(quantity * raidWeight + (Math.random() < raidWeight ? 1 : 0)));
      if (seizedQuantity <= 0) continue;
      holding.quantity -= seizedQuantity;
      seizedItems.push({
        itemId: item.id,
        name: item.name,
        rarity: itemRarity(item),
        quantity: seizedQuantity,
        value: itemValue(item, store) * seizedQuantity,
        contraband: Boolean(item.contraband)
      });
    }

    wallet.holdings = wallet.holdings.filter((holding) => Number(holding.quantity || 0) > 0);
    const seizedValue = seizedItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const fine = Math.max(0, Number(fineAmount || 0));
    if (fine) {
      wallet.balance = Math.max(0, Number(wallet.balance || 0) - fine);
      wallet.seizedCredits = Number(wallet.seizedCredits || 0) + fine;
      pushTransaction(store, {
        fromWalletId: wallet.id,
        toWalletId: "mss",
        amount: fine,
        type: "raid_fine",
        reason,
        createdBy: actor,
        meta: { raidId }
      });
    }
    if (restrictHours) {
      wallet.actionBans.unshift({
        actionId: "market",
        reason: `MSS raid restriction: ${reason}`,
        until: new Date(Date.now() + Number(restrictHours) * 60 * 60 * 1000).toISOString()
      });
    }
    wallet.suspicionLevel = Math.min(100, Math.max(0, wallet.suspicionLevel + (seizedItems.some((item) => item.contraband) ? 18 : 6)));
    wallet.securityStatus = calculateWalletSuspicion(store, wallet).status;
    wallet.raidCooldownUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    wallet.updatedAt = now;

    const log = {
      id: createId("raid-log"),
      raidId,
      walletId: wallet.id,
      displayName: wallet.displayName,
      district: wallet.district,
      raidType,
      reason: cleanText(reason, 500),
      suspicionBefore: suspicion.score,
      suspicionAfter: wallet.suspicionLevel,
      securityStatus: wallet.securityStatus,
      seizedItems,
      seizedValue,
      fineAmount: fine,
      restrictHours: Math.max(0, Number(restrictHours || 0)),
      createdAt: now,
      createdBy: actor
    };
    logs.push(log);
    postMssAlert(store, wallet, {
      severity: wallet.securityStatus === "Critical" ? "critical" : "high",
      type: "mss_raid",
      fine,
      summary: `MSS raid completed for ${wallet.displayName}. Seized ${seizedItems.length} item type(s), ${seizedValue} PC value.`,
      action: "raid"
    });
    pushTransaction(store, {
      fromWalletId: wallet.id,
      toWalletId: "mss-evidence-locker",
      amount: seizedValue,
      type: "mss_raid",
      reason: `${raidType}: ${reason}`,
      createdBy: actor,
      meta: { raidId, seizedItems: seizedItems.length }
    });
  }

  store.raidLogs = [...logs, ...(store.raidLogs || [])].slice(0, 500);
  return { ok: Boolean(logs.length), raidId, logs, store: await saveEconomyStore(store) };
}

export function getSecurityDashboard(store, wallet = null) {
  const scored = (store.wallets || []).map((entry) => {
    const suspicion = calculateWalletSuspicion(store, entry);
    return { wallet: entry, ...suspicion };
  }).sort((a, b) => b.score - a.score);
  return {
    current: wallet ? calculateWalletSuspicion(store, wallet) : null,
    flagged: scored.filter((entry) => entry.score >= 35).slice(0, 12),
    raidLogs: (store.raidLogs || []).slice(0, 30)
  };
}

export function getStockMarketDashboard(store, wallet) {
  const companies = [...(store.stockCompanies || [])].map((company) => ({ ...company }));
  const indexValue = Math.round(companies.reduce((sum, company) => sum + Number(company.sharePrice || 0), 0) * 100) / 100;
  const topGainers = [...companies].sort((a, b) => Number(b.dailyChangePercent || 0) - Number(a.dailyChangePercent || 0)).slice(0, 5);
  const topLosers = [...companies].sort((a, b) => Number(a.dailyChangePercent || 0) - Number(b.dailyChangePercent || 0)).slice(0, 5);
  const tradeCounts = new Map();
  for (const trade of store.stockTrades || []) {
    tradeCounts.set(trade.ticker, (tradeCounts.get(trade.ticker) || 0) + Number(trade.shares || 0));
  }
  const mostTraded = [...companies].sort((a, b) => (tradeCounts.get(b.ticker) || 0) - (tradeCounts.get(a.ticker) || 0)).slice(0, 5);
  const positions = (wallet?.stockPortfolio || []).map((position) => {
    const company = companies.find((entry) => entry.ticker === position.ticker);
    const currentValue = Number(position.shares || 0) * Number(company?.sharePrice || 0);
    const costBasis = Number(position.shares || 0) * Number(position.averagePrice || 0);
    return {
      ...position,
      company,
      currentValue,
      profitLoss: currentValue - costBasis,
      profitLossPercent: costBasis ? ((currentValue - costBasis) / costBasis) * 100 : 0
    };
  }).filter((position) => Number(position.shares || 0) > 0);
  const portfolioValue = positions.reduce((sum, position) => sum + position.currentValue, 0);
  const investorLeaderboard = [...(store.wallets || [])].map((entry) => {
    const value = (entry.stockPortfolio || []).reduce((sum, position) => {
      const company = companies.find((item) => item.ticker === position.ticker);
      return sum + Number(position.shares || 0) * Number(company?.sharePrice || 0);
    }, 0);
    return { wallet: entry, value };
  }).sort((a, b) => b.value - a.value).slice(0, 10);
  return {
    exchangeName: "Panem Stock Exchange",
    tickerName: "PSE",
    indexValue,
    topGainers,
    topLosers,
    mostTraded,
    companies,
    positions,
    portfolioValue,
    investorLeaderboard,
    news: (store.stockEvents || []).slice(0, 10),
    settings: store.stockSettings || { transactionTax: 0.015, transactionFee: 2 }
  };
}

export async function buyStock({ walletId, ticker, shares, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const company = store.stockCompanies.find((entry) => entry.ticker.toLowerCase() === String(ticker || "").toLowerCase());
  const count = Math.max(1, Number.parseInt(shares || "1", 10));
  if (!wallet || !company || wallet.status !== "active" || wallet.portfolioFrozen || company.status !== "active") return { ok: false, store };
  ensureWalletCollections(wallet);
  applyStockMovement(store, company, Math.min(0.018, count / 10000));
  const subtotal = Math.round(Number(company.sharePrice || 0) * count * 100) / 100;
  const tax = Math.round(subtotal * Number(store.stockSettings?.transactionTax || 0.015) * 100) / 100;
  const fee = Number(store.stockSettings?.transactionFee || 2);
  const total = subtotal + tax + fee;
  if (Number(wallet.balance || 0) < total) return { ok: false, store };
  const position = getStockPosition(wallet, company.ticker);
  const previousShares = Number(position.shares || 0);
  const previousCost = previousShares * Number(position.averagePrice || 0);
  position.shares = previousShares + count;
  position.averagePrice = Math.round(((previousCost + subtotal) / position.shares) * 100) / 100;
  wallet.balance -= total;
  wallet.title = Number(position.shares) >= 100 ? (wallet.title || "State Shareholder") : wallet.title;
  wallet.updatedAt = new Date().toISOString();
  const trade = { id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "buy", shares: count, price: company.sharePrice, subtotal, tax, fee, createdAt: new Date().toISOString(), createdBy: actor };
  store.stockTrades = [trade, ...(store.stockTrades || [])].slice(0, 1000);
  pushTransaction(store, { fromWalletId: wallet.id, toWalletId: "pse", amount: total, type: "stock_buy", reason: `${count} ${company.ticker} shares`, taxAmount: tax, createdBy: actor, meta: { key: company.ticker } });
  return { ok: true, company, shares: count, total, store: await saveEconomyStore(store) };
}

export async function sellStock({ walletId, ticker, shares, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const company = store.stockCompanies.find((entry) => entry.ticker.toLowerCase() === String(ticker || "").toLowerCase());
  const count = Math.max(1, Number.parseInt(shares || "1", 10));
  if (!wallet || !company || wallet.status !== "active" || wallet.portfolioFrozen || company.status !== "active") return { ok: false, store };
  ensureWalletCollections(wallet);
  const position = getStockPosition(wallet, company.ticker);
  if (Number(position.shares || 0) < count) return { ok: false, store };
  applyStockMovement(store, company, -Math.min(0.018, count / 10000));
  const subtotal = Math.round(Number(company.sharePrice || 0) * count * 100) / 100;
  const tax = Math.round(subtotal * Number(store.stockSettings?.transactionTax || 0.015) * 100) / 100;
  const fee = Number(store.stockSettings?.transactionFee || 2);
  const proceeds = Math.max(0, subtotal - tax - fee);
  position.shares -= count;
  wallet.stockPortfolio = wallet.stockPortfolio.filter((entry) => Number(entry.shares || 0) > 0);
  wallet.balance += proceeds;
  wallet.updatedAt = new Date().toISOString();
  const trade = { id: createId("stock-trade"), walletId: wallet.id, ticker: company.ticker, side: "sell", shares: count, price: company.sharePrice, subtotal, tax, fee, createdAt: new Date().toISOString(), createdBy: actor };
  store.stockTrades = [trade, ...(store.stockTrades || [])].slice(0, 1000);
  pushTransaction(store, { fromWalletId: "pse", toWalletId: wallet.id, amount: proceeds, type: "stock_sell", reason: `${count} ${company.ticker} shares`, taxAmount: tax, createdBy: actor, meta: { key: company.ticker } });
  return { ok: true, company, shares: count, proceeds, store: await saveEconomyStore(store) };
}

export async function updateStockWatchlist({ walletId, ticker, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const company = store.stockCompanies.find((entry) => entry.ticker.toLowerCase() === String(ticker || "").toLowerCase());
  if (!wallet || !company) return { ok: false, store };
  ensureWalletCollections(wallet);
  wallet.stockWatchlist = wallet.stockWatchlist.includes(company.ticker)
    ? wallet.stockWatchlist.filter((entry) => entry !== company.ticker)
    : [company.ticker, ...wallet.stockWatchlist].slice(0, 20);
  pushTransaction(store, { fromWalletId: wallet.id, toWalletId: "pse-watch", amount: 0, type: "stock_watchlist", reason: company.ticker, createdBy: actor });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function triggerStockMarketEvent({ eventId, actor = "treasury" }) {
  const store = await getEconomyStore();
  const event = stockMarketEventDefaults.find((entry) => entry.id === eventId) || stockMarketEventDefaults[0];
  const targets = event.tickers.length ? event.tickers : store.stockCompanies.map((company) => company.ticker);
  for (const company of store.stockCompanies) {
    if (!targets.includes(company.ticker)) continue;
    const previous = Number(company.sharePrice || 1);
    company.sharePrice = Math.max(1, Math.round(previous * (1 + Number(event.priceImpact || 0)) * 100) / 100);
    company.dailyChangePercent = Math.round(((company.sharePrice - previous) / previous) * 1000) / 10;
    company.priceHistory = [...(company.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }].slice(-30);
  }
  const notice = { ...event, id: createId("stock-event"), createdAt: new Date().toISOString(), createdBy: actor };
  store.stockEvents = [notice, ...(store.stockEvents || [])].slice(0, 50);
  pushTransaction(store, { fromWalletId: "treasury", toWalletId: "pse", amount: 0, type: "stock_event", reason: event.title, createdBy: actor, meta: { key: event.id } });
  return { ok: true, event: notice, store: await saveEconomyStore(store) };
}

export async function updateStockAdmin(fields, actor = "treasury") {
  const store = await getEconomyStore();
  const ticker = String(fields.ticker || "").trim().toUpperCase();
  const company = store.stockCompanies.find((entry) => entry.ticker === ticker);
  if (company) {
    if (fields.sharePrice !== undefined) company.sharePrice = Math.max(1, Number(fields.sharePrice || company.sharePrice));
    if (fields.status) company.status = cleanText(fields.status, 40);
    if (fields.riskLevel) company.riskLevel = cleanText(fields.riskLevel, 40);
    if (fields.dividendRate !== undefined) company.dividendRate = Math.max(0, Number(fields.dividendRate || 0));
    company.priceHistory = [...(company.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }].slice(-30);
  } else if (fields.name && ticker) {
    store.stockCompanies.unshift({
      id: createId("stock"),
      name: cleanText(fields.name, 120),
      ticker,
      district: cleanText(fields.district || "The Capitol", 80),
      sector: cleanText(fields.sector || "State enterprise", 80),
      description: cleanText(fields.description || "Newly listed PSE company.", 400),
      sharePrice: Math.max(1, Number(fields.sharePrice || 25)),
      marketCap: Math.max(1000, Number(fields.marketCap || 1000000)),
      dailyChangePercent: 0,
      riskLevel: cleanText(fields.riskLevel || "Moderate", 40),
      dividendRate: Math.max(0, Number(fields.dividendRate || 0)),
      status: "active",
      priceHistory: [{ date: new Date().toISOString().slice(0, 10), price: Math.max(1, Number(fields.sharePrice || 25)) }]
    });
  }
  if (fields.transactionTax !== undefined) {
    store.stockSettings.transactionTax = Math.max(0, Number(fields.transactionTax || 0));
  }
  pushTransaction(store, { fromWalletId: "treasury", toWalletId: "pse", amount: 0, type: "stock_admin", reason: cleanText(fields.reason || "Stock market settings updated", 400), createdBy: actor });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function issueStockDividends({ ticker = "", actor = "treasury" }) {
  const store = await getEconomyStore();
  const companies = ticker
    ? store.stockCompanies.filter((company) => company.ticker === String(ticker).toUpperCase())
    : store.stockCompanies.filter((company) => Number(company.dividendRate || 0) > 0);
  let total = 0;
  for (const company of companies) {
    for (const wallet of store.wallets) {
      const position = (wallet.stockPortfolio || []).find((entry) => entry.ticker === company.ticker);
      if (!position || Number(position.shares || 0) <= 0) continue;
      const amount = Math.round(Number(position.shares || 0) * Number(company.sharePrice || 0) * Number(company.dividendRate || 0) * 100) / 100;
      if (amount <= 0) continue;
      wallet.balance += amount;
      position.dividendsEarned = Number(position.dividendsEarned || 0) + amount;
      total += amount;
      pushTransaction(store, { fromWalletId: company.ticker, toWalletId: wallet.id, amount, type: "stock_dividend", reason: `${company.ticker} dividend`, createdBy: actor, meta: { key: company.ticker } });
    }
  }
  store.stockEvents = [{ id: createId("stock-event"), title: `PSE dividends issued: ${formatCredits(total)}`, tickers: companies.map((company) => company.ticker), priceImpact: 0, severity: "low", createdAt: new Date().toISOString(), createdBy: actor }, ...(store.stockEvents || [])].slice(0, 50);
  return { ok: true, total, store: await saveEconomyStore(store) };
}

export async function debitWallet({ walletId, amount, reason, type = "fine", actor = "treasury" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const numericAmount = Math.max(0, Number(amount || 0));
  if (!wallet || numericAmount <= 0) {
    return { ok: false, store };
  }
  wallet.balance = Math.max(0, wallet.balance - numericAmount);
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "treasury",
    amount: numericAmount,
    type,
    reason: cleanText(reason || "State debit", 500),
    createdBy: actor
  });
  if (type === "fine") {
    wallet.taxStatus = "penalty issued";
  }
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function executeWalletEnforcement({
  walletId,
  action = "none",
  amount = 0,
  reason = "State enforcement action",
  actor = "treasury",
  authority = "Government"
}) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const numericAmount = Math.max(0, Number(amount || 0));
  const cleanReason = cleanText(reason || "State enforcement action", 500);
  const now = new Date().toISOString();

  if (!wallet) {
    return { ok: false, store, reason: "wallet-not-found" };
  }

  let transaction = null;
  const baseTransaction = {
    fromWalletId: wallet.id,
    toWalletId: "treasury",
    amount: numericAmount,
    type: action,
    reason: `${authority}: ${cleanReason}`,
    createdBy: actor,
    meta: { authority }
  };

  if (action === "emergency_taxation") {
    if (wallet.exempt || numericAmount <= 0) return { ok: false, store, reason: "invalid-tax" };
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - numericAmount);
    wallet.taxStatus = "emergency taxation issued";
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: wallet.id,
      taxType: "emergency_state_levy",
      amount: numericAmount,
      rate: 0,
      status: "paid",
      reason: cleanReason,
      createdAt: now,
      createdBy: actor
    });
    transaction = baseTransaction;
  } else if (action === "fine") {
    if (numericAmount <= 0) return { ok: false, store, reason: "invalid-fine" };
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - numericAmount);
    wallet.taxStatus = "penalty issued";
    transaction = { ...baseTransaction, type: "fine" };
  } else if (action === "asset_seizure") {
    if (numericAmount <= 0) return { ok: false, store, reason: "invalid-seizure" };
    wallet.balance = Math.max(0, Number(wallet.balance || 0) - numericAmount);
    wallet.seizedCredits = Number(wallet.seizedCredits || 0) + numericAmount;
    wallet.underReview = true;
    transaction = { ...baseTransaction, type: "asset_seizure", toWalletId: "mss" };
  } else if (action === "wallet_freeze" || action === "wallet_unfreeze") {
    wallet.status = action === "wallet_freeze" ? "frozen" : "active";
    transaction = {
      ...baseTransaction,
      amount: 0,
      type: action,
      toWalletId: wallet.id,
      reason: `${authority}: wallet ${wallet.status}. ${cleanReason}`
    };
  } else if (action === "tax_rebate" || action === "grant_payment") {
    if (numericAmount <= 0) return { ok: false, store, reason: "invalid-payment" };
    wallet.balance = Number(wallet.balance || 0) + numericAmount;
    transaction = {
      ...baseTransaction,
      fromWalletId: "treasury",
      toWalletId: wallet.id,
      type: action,
      reason: `${authority}: ${cleanReason}`
    };
  } else {
    transaction = {
      ...baseTransaction,
      amount: 0,
      type: "citizen_notice",
      toWalletId: wallet.id
    };
  }

  wallet.updatedAt = now;
  pushTransaction(store, transaction);
  const saved = await saveEconomyStore(store);
  return { ok: true, store: saved, wallet, transaction: saved.transactions[0] };
}

export async function applyTax({ walletId, taxType, amount, actor = "treasury", status = "paid" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const numericAmount = Math.max(0, Number(amount || 0));
  const rate = Number(store.taxRates[taxType] || 0);
  if (!wallet || wallet.exempt || numericAmount <= 0) {
    return { ok: false, store };
  }
  wallet.balance = Math.max(0, wallet.balance - numericAmount);
  wallet.taxStatus = status === "paid" ? "compliant" : "outstanding";
  wallet.updatedAt = new Date().toISOString();
  store.taxRecords.unshift({
    id: createId("tax"),
    walletId: wallet.id,
    taxType,
    amount: numericAmount,
    rate,
    status,
    createdAt: new Date().toISOString()
  });
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "treasury",
    amount: numericAmount,
    type: taxType,
    reason: "Taxation sustains the Union.",
    taxAmount: numericAmount,
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function runAutomaticTaxation(actor = "treasury") {
  const store = await getEconomyStore();
  const rate = Number(store.taxRates.income_tax || 0);
  for (const wallet of store.wallets) {
    if (wallet.exempt || wallet.status === "frozen") {
      continue;
    }
    const amount = Math.max(1, Math.round(Number(wallet.balance || 0) * rate * 100) / 100);
    wallet.balance = Math.max(0, wallet.balance - amount);
    wallet.taxStatus = "compliant";
    wallet.updatedAt = new Date().toISOString();
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: wallet.id,
      taxType: "income_tax",
      amount,
      rate,
      status: "paid",
      createdAt: new Date().toISOString()
    });
    pushTransaction(store, {
      fromWalletId: wallet.id,
      toWalletId: "treasury",
      amount,
      type: "income_tax",
      reason: "Taxation sustains the Union.",
      taxAmount: amount,
      createdBy: actor
    });
  }
  return saveEconomyStore(store);
}

export async function buyMarketItem({ walletId, itemId, quantity, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  const item = store.marketItems.find((entry) => entry.id === itemId);
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!wallet || !item || wallet.status !== "active" || item.stock < count || (item.restricted && wallet.status !== "active")) {
    return { ok: false, store };
  }
  const subtotal = Number(item.currentPrice || item.basePrice || 0) * count;
  const taxType = item.category === "Luxury Goods" ? "luxury_goods_tax" : "trade_tax";
  const taxAmount = wallet.exempt ? 0 : Math.round(subtotal * Number(store.taxRates[taxType] || 0) * 100) / 100;
  const total = subtotal + taxAmount;
  if (wallet.balance < total) {
    return { ok: false, store };
  }
  wallet.balance -= total;
  item.stock -= count;
  addHolding(wallet, item.id, count, Number(item.currentPrice || item.basePrice || 0));
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "market",
    amount: subtotal,
    type: "market_buy",
    reason: `${count} x ${item.name}`,
    taxAmount,
    createdBy: actor
  });
  if (taxAmount) {
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: wallet.id,
      taxType,
      amount: taxAmount,
      rate: Number(store.taxRates[taxType] || 0),
      status: "paid",
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function createListing({ sellerWalletId, itemId, quantity, price, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, sellerWalletId);
  const item = store.marketItems.find((entry) => entry.id === itemId) || getInventoryItem(itemId);
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!wallet || !item || wallet.status !== "active" || !removeHolding(wallet, item.id, count)) {
    return { ok: false, store };
  }
  store.listings.unshift({
    id: createId("listing"),
    sellerWalletId: wallet.id,
    itemId: item.id,
    quantity: count,
    price: Math.max(1, Number(price || item.currentPrice || item.basePrice || 1)),
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: actor
  });
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "market-listings",
    amount: Math.max(1, Number(price || item.currentPrice || item.basePrice || 1)) * count,
    type: "listing_created",
    reason: `${count} x ${item.name} listed`,
    createdBy: actor,
    meta: { key: item.id }
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function buyCitizenListing({ buyerWalletId, listingId, quantity, actor = "citizen" }) {
  const store = await getEconomyStore();
  const buyer = getWallet(store, buyerWalletId);
  const listing = store.listings.find((entry) => entry.id === listingId && entry.status === "active");
  const seller = listing ? getWallet(store, listing.sellerWalletId) : null;
  const item = listing ? store.marketItems.find((entry) => entry.id === listing.itemId) || getInventoryItem(listing.itemId) : null;
  const count = Math.max(1, Number.parseInt(quantity || "1", 10));
  if (!listing) return { ok: false, store, reason: "listing-missing" };
  if (!buyer) return { ok: false, store, reason: "wallet" };
  if (!seller) return { ok: false, store, reason: "seller-wallet" };
  if (!item) return { ok: false, store, reason: "item" };
  if (buyer.status !== "active") return { ok: false, store, reason: "wallet-status" };
  if (seller.id === buyer.id) return { ok: false, store, reason: "self-purchase" };
  if (Number(listing.quantity || 0) < count) return { ok: false, store, reason: "listing-quantity" };
  const subtotal = Number(listing.price || 0) * count;
  const taxType = item.category === "Luxury Goods" || item.type === "luxury" ? "luxury_goods_tax" : "trade_tax";
  const taxAmount = buyer.exempt ? 0 : Math.round(subtotal * Number(store.taxRates[taxType] || 0) * 100) / 100;
  if (Number(buyer.balance || 0) < subtotal + taxAmount) return { ok: false, store, reason: "balance" };
  const sellerTaxRate = item.contraband ? 0.25 : itemRarity(item) === "legendary" || itemRarity(item) === "epic" ? 0.2 : 0.15;
  const sellerTax = seller.exempt ? 0 : Math.round(subtotal * sellerTaxRate * 100) / 100;
  buyer.balance -= subtotal + taxAmount;
  seller.balance += Math.max(0, subtotal - sellerTax);
  seller.suspicionLevel = Math.max(0, Number(seller.suspicionLevel || 0) - 3);
  seller.securityStatus = calculateWalletSuspicion(store, seller).status;
  listing.quantity -= count;
  listing.status = listing.quantity > 0 ? "active" : "sold";
  listing.updatedAt = new Date().toISOString();
  addHolding(buyer, item.id, count, listing.price);
  buyer.updatedAt = new Date().toISOString();
  seller.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: buyer.id,
    toWalletId: seller.id,
    amount: subtotal,
    type: "listing_buy",
    reason: `${count} x ${item.name} from ${seller.displayName}`,
    taxAmount: taxAmount + sellerTax,
    createdBy: actor,
    meta: { key: listing.id, itemId: item.id, buyerTax: taxAmount, sellerTax, sellerTaxRate }
  });
  if (taxAmount) {
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: buyer.id,
      taxType,
      amount: taxAmount,
      rate: Number(store.taxRates[taxType] || 0),
      status: "paid",
      createdAt: new Date().toISOString()
    });
  }
  if (sellerTax) {
    store.taxRecords.unshift({
      id: createId("tax"),
      walletId: seller.id,
      taxType: "market_sale_tax",
      amount: sellerTax,
      rate: sellerTaxRate,
      status: "paid",
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function updateMarketPreferences({ walletId, itemId = "", district = "", alerts, actor = "citizen" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  if (!wallet) return { ok: false, store };
  ensureWalletCollections(wallet);
  if (itemId) {
    wallet.watchlist = wallet.watchlist.includes(itemId)
      ? wallet.watchlist.filter((entry) => entry !== itemId)
      : [itemId, ...wallet.watchlist].slice(0, 12);
  }
  if (district) {
    wallet.favouriteDistricts = wallet.favouriteDistricts.includes(district)
      ? wallet.favouriteDistricts.filter((entry) => entry !== district)
      : [district, ...wallet.favouriteDistricts].slice(0, 6);
  }
  if (alerts !== undefined) {
    wallet.marketAlerts = alerts === true || alerts === "on";
  }
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "market-watch",
    amount: 0,
    type: "market_preferences",
    reason: "Marketplace watch settings updated",
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export function getMarketDashboard(store) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = (store.transactions || []).filter((transaction) =>
    ["market_buy", "listing_buy", "market_sell", "listing_created"].includes(transaction.type) &&
    String(transaction.createdAt || "").startsWith(today)
  );
  const totalTradeVolumeToday = todayTrades.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const items = [...(store.marketItems || [])].map((item) => ({
    ...item,
    changePercent: marketChangePercent(item),
    taxRate: item.category === "Luxury Goods" ? Number(store.taxRates?.luxury_goods_tax || 0) : Number(store.taxRates?.trade_tax || 0)
  }));
  const topGainers = [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const priceDrops = [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
  const activeShortages = items.filter((item) => Number(item.stock || 0) < 35 || item.changePercent > 12).slice(0, 8);
  const districtRows = [...(store.districts || [])].map((district) => {
    const goods = items.filter((item) => item.district === district.name);
    const output = Math.max(0, Math.round((Number(district.supplyLevel || 0) + Number(district.prosperityRating || 0)) / 2));
    const multiplier = goods.length
      ? goods.reduce((sum, item) => sum + Number(item.currentPrice || 0) / Math.max(1, Number(item.basePrice || 1)), 0) / goods.length
      : 1;
    const changePercent = Math.round(((Number(district.demandLevel || 0) - Number(district.supplyLevel || 0)) / 3) * 10) / 10;
    return { ...district, goods, output, multiplier, changePercent };
  }).sort((a, b) => Number(b.tradeVolume || 0) - Number(a.tradeVolume || 0)).map((district, index) => ({ ...district, tradeRank: index + 1 }));
  const mostActiveDistrict = districtRows[0];
  const traderTotals = new Map();
  for (const transaction of todayTrades) {
    const walletId = transaction.fromWalletId;
    traderTotals.set(walletId, (traderTotals.get(walletId) || 0) + Number(transaction.amount || 0));
  }
  const richestTraderTodayId = [...traderTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const richestTraderToday = store.wallets.find((wallet) => wallet.id === richestTraderTodayId) || [...(store.wallets || [])].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
  return {
    totalTradeVolumeToday,
    topGainers,
    priceDrops,
    activeShortages,
    districtRows,
    mostActiveDistrict,
    richestTraderToday,
    items,
    notices: (store.marketNotices || []).slice(0, 6)
  };
}

export async function updateWalletStatus({ walletId, status, actor = "treasury" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  if (!wallet || !walletStatuses.includes(status)) {
    return { ok: false, store };
  }
  wallet.status = status;
  wallet.updatedAt = new Date().toISOString();
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: wallet.id,
    amount: 0,
    type: `wallet_${status}`,
    reason: `Wallet status set to ${status}`,
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function markWalletWanted({ walletId, bounty = 250, reason = "MSS warrant", actor = "mss" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  if (!wallet) return { ok: false, store };
  ensureWalletCollections(wallet);
  wallet.wanted = true;
  wallet.underReview = true;
  wallet.bounty = Math.max(Number(wallet.bounty || 0), Number(bounty || 0));
  wallet.taxStatus = "MSS watchlist";
  wallet.updatedAt = new Date().toISOString();
  postMssAlert(store, wallet, {
    severity: "critical",
    type: "wanted_financier",
    bounty: wallet.bounty,
    wanted: true,
    summary: `${wallet.displayName} marked wanted by MSS. ${cleanText(reason, 200)}`
  });
  pushTransaction(store, {
    fromWalletId: wallet.id,
    toWalletId: "mss",
    amount: 0,
    type: "wanted",
    reason,
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function pardonWallet({ walletId, reason = "MSS pardon", actor = "mss" }) {
  const store = await getEconomyStore();
  const wallet = getWallet(store, walletId);
  if (!wallet) return { ok: false, store };
  wallet.wanted = false;
  wallet.underReview = false;
  wallet.bounty = 0;
  wallet.taxStatus = "compliant";
  wallet.updatedAt = new Date().toISOString();
  store.alerts = (store.alerts || []).map((alert) =>
    alert.walletId === wallet.id ? { ...alert, status: "cleared", resolvedAt: new Date().toISOString(), resolvedBy: actor } : alert
  );
  pushTransaction(store, {
    fromWalletId: "mss",
    toWalletId: wallet.id,
    amount: 0,
    type: "pardon",
    reason,
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}

export async function triggerEconomyEvent({ eventId, durationHours = 168, actor = "treasury" }) {
  const store = await getEconomyStore();
  const event = economyEventDefaults.find((entry) => entry.id === eventId) || economyEventDefaults[0];
  const now = new Date();
  const active = {
    ...event,
    status: "active",
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + Math.max(1, Number(durationHours || 168)) * 60 * 60 * 1000).toISOString(),
    triggeredBy: actor
  };
  applyDynamicEventEffects(store, active);
  store.events = [active, ...(store.events || []).map((entry) => ({ ...entry, status: entry.status === "active" ? "expired" : entry.status }))].slice(0, 20);
  pushTransaction(store, {
    fromWalletId: "treasury",
    toWalletId: "ledger",
    amount: 0,
    type: "economy_event",
    reason: active.title,
    createdBy: actor,
    meta: { key: active.id }
  });
  return { ok: true, event: active, store: await saveEconomyStore(store) };
}

function applyDynamicEventEffects(store, event) {
  const modifiers = event.modifiers || {};
  for (const district of store.districts || []) {
    if (!eventAffectsDistrict(event, district.name)) continue;
    district.supplyLevel = clampNumber(Number(district.supplyLevel || 0) + Number(modifiers.supplyDelta || 0), 0, 140);
    district.demandLevel = clampNumber(Number(district.demandLevel || 0) + Number(modifiers.demandDelta || 0), 0, 140);
    district.developmentStatus = event.title;
  }
  for (const item of store.marketItems || []) {
    if (!eventAffectsGood(event, item)) continue;
    const previous = Number(item.currentPrice || item.basePrice || 1);
    item.currentPrice = Math.max(1, Math.round(previous * (1 + Number(modifiers.itemPricePercent || 0))));
    item.priceHistory = [...(item.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: item.currentPrice }].slice(-30);
  }
  for (const company of store.stockCompanies || []) {
    if (!eventAffectsCompany(event, company)) continue;
    const previous = Number(company.sharePrice || 1);
    company.sharePrice = Math.max(1, Math.round(previous * (1 + Number(modifiers.stockPercent || 0)) * 100) / 100);
    company.dailyChangePercent = Math.round(((company.sharePrice - previous) / previous) * 1000) / 10;
    company.priceHistory = [...(company.priceHistory || []), { date: new Date().toISOString().slice(0, 10), price: company.sharePrice }].slice(-30);
  }
  store.marketNotices = [
    {
      id: createId("notice"),
      title: event.title,
      body: event.summary || event.description || "A state economy event has changed market conditions.",
      severity: event.alertSeverity || "medium",
      createdAt: new Date().toISOString()
    },
    ...(store.marketNotices || [])
  ].slice(0, 20);
}

export async function triggerRandomEconomyEvent({ actor = "treasury", durationHours = 72 } = {}) {
  const event = dynamicEconomyEventDefaults[Math.floor(Math.random() * dynamicEconomyEventDefaults.length)] || economyEventDefaults[0];
  return triggerEconomyEvent({ eventId: event.id, durationHours: event.durationHours || durationHours, actor });
}

export async function updateEconomyAdmin(fields, actor = "treasury") {
  const store = await getEconomyStore();
  if (fields.taxType && fields.taxRate !== undefined) {
    store.taxRates[fields.taxType] = Math.max(0, Number(fields.taxRate || 0));
  }
  if (fields.districtId) {
    store.districts = store.districts.map((district) =>
      district.id === fields.districtId
        ? {
            ...district,
            supplyLevel: Math.max(0, Number(fields.supplyLevel ?? district.supplyLevel)),
            demandLevel: Math.max(0, Number(fields.demandLevel ?? district.demandLevel)),
            prosperityRating: Math.max(0, Number(fields.prosperityRating ?? district.prosperityRating)),
            taxContribution: Math.max(0, Number(fields.taxContribution ?? district.taxContribution)),
            tradeVolume: Math.max(0, Number(fields.tradeVolume ?? district.tradeVolume)),
            loyaltyScore: Math.max(0, Number(fields.loyaltyScore ?? district.loyaltyScore)),
            developmentStatus: cleanText(fields.developmentStatus || district.developmentStatus, 120)
          }
        : district
    );
  }
  if (fields.itemId) {
    store.marketItems = store.marketItems.map((item) =>
      item.id === fields.itemId
        ? {
            ...item,
            currentPrice: Math.max(1, Number(fields.currentPrice ?? item.currentPrice)),
            stock: Math.max(0, Number(fields.stock ?? item.stock)),
            restricted: Boolean(fields.restricted),
            description: cleanText(fields.description || item.description, 500)
          }
        : item
    );
  }
  pushTransaction(store, {
    fromWalletId: "treasury",
    toWalletId: "ledger",
    amount: 0,
    type: "economy_admin",
    reason: cleanText(fields.reason || "Economy settings updated", 500),
    createdBy: actor
  });
  return saveEconomyStore(store);
}

export async function reverseTransaction(transactionId, actor = "treasury") {
  const store = await getEconomyStore();
  const transaction = store.transactions.find((item) => item.id === transactionId);
  if (!transaction || transaction.reversedAt) {
    return { ok: false, store };
  }
  const fromWallet = getWallet(store, transaction.fromWalletId);
  const toWallet = getWallet(store, transaction.toWalletId);
  if (fromWallet && toWallet && Number(transaction.amount || 0) > 0) {
    toWallet.balance = Math.max(0, Number(toWallet.balance || 0) - Number(transaction.amount || 0));
    fromWallet.balance += Number(transaction.amount || 0) + Number(transaction.taxAmount || 0);
  }
  transaction.reversedAt = new Date().toISOString();
  transaction.reversedBy = actor;
  pushTransaction(store, {
    fromWalletId: transaction.toWalletId,
    toWalletId: transaction.fromWalletId,
    amount: transaction.amount,
    type: "reversal",
    reason: `Reversal of ${transaction.id}`,
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
}
