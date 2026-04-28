import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  calculateMarketPrice,
  districtEconomyDefaults,
  marketItemDefaults,
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

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function defaultTaxRates() {
  return Object.fromEntries(taxTypes.map((tax) => [tax.id, tax.defaultRate]));
}

export function normalizeEconomyStore(economy = {}) {
  const districts = Array.isArray(economy.districts) && economy.districts.length
    ? economy.districts
    : districtEconomyDefaults;
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
      salary: Math.max(0, Number(wallet.salary ?? 125))
    })),
    transactions: Array.isArray(economy.transactions) ? economy.transactions : [],
    marketItems,
    listings: Array.isArray(economy.listings) ? economy.listings : [],
    taxRecords: Array.isArray(economy.taxRecords) ? economy.taxRecords : [],
    taxRates: { ...defaultTaxRates(), ...(economy.taxRates || {}) },
    districts,
    alerts: Array.isArray(economy.alerts) ? economy.alerts : [],
    categories: Array.isArray(economy.categories) && economy.categories.length
      ? economy.categories
      : [...new Set(marketItemDefaults.map((item) => item.category))],
    events: Array.isArray(economy.events) ? economy.events : []
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
    body: JSON.stringify({ economy }),
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
  const normalized = normalizeEconomyStore(economy);

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

  if (!fromWallet || !toWallet || numericAmount <= 0 || fromWallet.status !== "active" || toWallet.status === "frozen") {
    return { ok: false, store };
  }

  if (fromWallet.balance < numericAmount) {
    return { ok: false, store };
  }

  const rate = Number(store.taxRates.trade_tax || 0);
  const taxAmount = type === "transfer" && !fromWallet.exempt ? Math.round(numericAmount * rate * 100) / 100 : 0;
  const totalDebit = numericAmount + taxAmount;
  if (fromWallet.balance < totalDebit) {
    return { ok: false, store };
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
  const item = store.marketItems.find((entry) => entry.id === itemId);
  if (!wallet || !item || wallet.status !== "active") {
    return { ok: false, store };
  }
  store.listings.unshift({
    id: createId("listing"),
    sellerWalletId: wallet.id,
    itemId: item.id,
    quantity: Math.max(1, Number.parseInt(quantity || "1", 10)),
    price: Math.max(1, Number(price || item.currentPrice || item.basePrice || 1)),
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: actor
  });
  return { ok: true, store: await saveEconomyStore(store) };
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
