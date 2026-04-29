export const currencyName = "Panem Credit";
export const currencySymbol = "PC";

export const taxTypes = [
  { id: "income_tax", label: "Income Tax", defaultRate: 0.08 },
  { id: "trade_tax", label: "Trade Tax", defaultRate: 0.05 },
  { id: "inventory_tax", label: "Inventory Tax", defaultRate: 0.05 },
  { id: "market_sale_tax", label: "Market Sale Tax", defaultRate: 0.18 },
  { id: "gambling_winnings_tax", label: "Gambling Winnings Tax", defaultRate: 0.08 },
  { id: "stock_trade_tax", label: "Stock Trade Tax", defaultRate: 0.015 },
  { id: "district_levy", label: "District Levy", defaultRate: 0.03 },
  { id: "emergency_state_levy", label: "Emergency State Levy", defaultRate: 0.02 },
  { id: "luxury_goods_tax", label: "Luxury Goods Tax", defaultRate: 0.12 },
  { id: "black_market_penalty_tax", label: "Black Market Penalty Tax", defaultRate: 0.55 },
  { id: "raid_recovery_fine_rate", label: "Raid Recovery Fine Rate", defaultRate: 0.25 }
];

export const walletStatuses = ["active", "frozen", "restricted"];

export const workPermitItemId = "work-permit";

export const lootboxDailyGlobalLimit = 15;
export const lootboxDailyUserLimit = 3;

export const lootboxCrateDefaults = [
  { id: "standard", label: "Standard Lootbox", price: 250, legendaryChance: 0.006, epicChance: 0.04, rareChance: 0.16, lowRollChance: 0.16 },
  { id: "premium", label: "Premium Lootbox", price: 750, legendaryChance: 0.018, epicChance: 0.09, rareChance: 0.28, lowRollChance: 0.1 },
  { id: "state-crate", label: "State Crate", price: 1500, legendaryChance: 0.04, epicChance: 0.16, rareChance: 0.36, lowRollChance: 0.06 }
];

export function economyTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getLootboxCrate(crateId = "standard") {
  return lootboxCrateDefaults.find((crate) => crate.id === crateId) || lootboxCrateDefaults[0];
}

export function compactEconomyStoreForWrite(economy = {}) {
  const compactArray = (value, limit) => Array.isArray(value) ? value.slice(0, limit) : [];
  const compactWallet = (wallet = {}) => {
    const compacted = {
      ...wallet,
      loginDays: compactArray(wallet.loginDays, 14),
      actionBans: compactArray(wallet.actionBans, 10),
      inventoryFlags: compactArray(wallet.inventoryFlags, 10),
      achievements: compactArray(wallet.achievements, 25),
      workPermits: compactArray(wallet.workPermits, 10),
      holdings: Array.isArray(wallet.holdings)
        ? wallet.holdings.map((holding) => ({
            ...holding,
            acquisitionHistory: Array.isArray(holding.acquisitionHistory)
              ? holding.acquisitionHistory.slice(0, 2)
              : []
          }))
        : [],
      stockPortfolio: Array.isArray(wallet.stockPortfolio)
        ? wallet.stockPortfolio.map((position) => ({
            ...position,
            tradeHistory: Array.isArray(position.tradeHistory) ? position.tradeHistory.slice(0, 3) : []
          }))
        : []
    };
    for (const [key, value] of Object.entries(compacted)) {
      if (Array.isArray(value) && key !== "holdings" && key !== "stockPortfolio") {
        compacted[key] = value.slice(0, 50);
      }
    }
    return compacted;
  };
  return {
    ...economy,
    transactions: compactArray(economy.transactions, 250),
    taxRecords: compactArray(economy.taxRecords, 250),
    alerts: compactArray(economy.alerts, 150),
    raidLogs: compactArray(economy.raidLogs, 100),
    listings: compactArray(economy.listings, 150),
    lootboxLogs: compactArray(economy.lootboxLogs, 100),
    wallets: Array.isArray(economy.wallets)
      ? economy.wallets.map(compactWallet)
      : []
  };
}

export function normalizeEconomyDistrict(district = "") {
  const value = String(district || "").trim();
  if (!value) return "The Capitol";
  if (/^(capitol|the capitol)$/i.test(value)) return "The Capitol";
  return value;
}

export function walletHasWorkPermit(wallet) {
  return walletHasActiveWorkPermit(wallet) || (wallet?.holdings || []).some(
    (holding) => holding.itemId === workPermitItemId && Number(holding.quantity || 0) > 0
  );
}

export function walletHasActiveWorkPermit(wallet, job = {}, options = {}) {
  const rawTargetDistrict = String(options.targetDistrict || job?.district || "").trim();
  const targetDistrict = rawTargetDistrict ? normalizeEconomyDistrict(rawTargetDistrict) : "";
  const jobId = String(options.jobId || job?.id || "").trim();
  const now = Date.now();
  return (wallet?.workPermits || []).some((permit) => {
    if (String(permit.status || "approved").toLowerCase() !== "approved") return false;
    if (permit.expiresAt && Date.parse(permit.expiresAt) <= now) return false;
    const permitDistrict = normalizeEconomyDistrict(permit.targetDistrict || permit.district || "");
    const permitJobId = String(permit.jobId || "").trim();
    return (!targetDistrict || permitDistrict === targetDistrict) && (!permitJobId || !jobId || permitJobId === jobId);
  });
}

export function walletHasRestrictedJobPermission(wallet, job = {}) {
  const permissions = new Set([
    ...(wallet?.permissions || []),
    ...(wallet?.roles || []),
    ...(wallet?.specialPermissions || [])
  ].map((entry) => String(entry || "").toLowerCase()));
  return permissions.has("restricted-jobs") ||
    permissions.has("district-13") ||
    permissions.has("mss") ||
    permissions.has("government");
}

export function getJobAccess(wallet, job, options = {}) {
  const walletDistrict = normalizeEconomyDistrict(wallet?.district || options.district || "");
  const jobDistrict = normalizeEconomyDistrict(job?.district || "");
  const native = !job || jobDistrict === "Any" || jobDistrict === walletDistrict;
  const restricted = jobDistrict === "District 13" || job?.riskLevel === "Restricted" || Boolean(job?.restricted);
  const hasRestrictedPermission = walletHasRestrictedJobPermission(wallet, job);
  if (restricted && !hasRestrictedPermission) {
    return {
      allowed: false,
      native,
      restricted: true,
      requiresWorkPermit: false,
      hasWorkPermit: walletHasWorkPermit(wallet),
      rewardMultiplier: 0,
      riskModifier: 0,
      label: "Restricted role",
      reason: "restricted-job",
      message: "This restricted role requires special government or MSS permission."
    };
  }
  if (native) {
    return {
      allowed: true,
      native: true,
      restricted,
      requiresWorkPermit: false,
      hasWorkPermit: walletHasWorkPermit(wallet),
      rewardMultiplier: 1,
      riskModifier: 0,
      label: "Native assignment"
    };
  }
  const structuredPermit = walletHasActiveWorkPermit(wallet, job, { targetDistrict: jobDistrict, jobId: job?.id });
  const legacyPermit = (wallet?.holdings || []).some(
    (holding) => holding.itemId === workPermitItemId && Number(holding.quantity || 0) > 0
  );
  const permit = structuredPermit || legacyPermit;
  const allowForeignWithPermit = options.allowForeignWithPermit !== false;
  return {
    allowed: permit && allowForeignWithPermit,
    native: false,
    restricted,
    requiresWorkPermit: true,
    hasWorkPermit: permit,
    rewardMultiplier: structuredPermit ? 0.8 : permit ? 0.6 : 0.5,
    riskModifier: structuredPermit ? 0.04 : permit ? 0.08 : 0.15,
    label: permit ? "Work permit active" : "Requires Work Permit",
    reason: permit && allowForeignWithPermit ? "" : "work-permit-required",
    message: "You cannot select this job outside your district without a work permit."
  };
}

export const economyEventDefaults = [
  {
    id: "chairman-prosperity-week",
    title: "Chairman Prosperity Week",
    summary: "Daily rewards, work payouts, and district labour bonuses are doubled under state celebration.",
    rewardMultiplier: 2,
    workMultiplier: 2,
    marketMultiplier: 1,
    alertSeverity: "low"
  },
  {
    id: "mss-anti-crime-sweep",
    title: "MSS Anti-Crime Sweep",
    summary: "Financial crime detection is intensified. Risk payouts rise, but penalties and detection are harsher.",
    rewardMultiplier: 1,
    workMultiplier: 1,
    crimeDetectionBonus: 0.18,
    crimePenaltyMultiplier: 1.35,
    alertSeverity: "critical"
  },
  {
    id: "district-harvest-festival",
    title: "District Harvest Festival",
    summary: "Food and agriculture output surges. District 4, 9, 10, and 11 work receives enhanced payouts.",
    rewardMultiplier: 1.25,
    workMultiplier: 1.2,
    marketMultiplier: 0.9,
    boostedDistricts: ["District 4", "District 9", "District 10", "District 11"],
    alertSeverity: "low"
  },
  {
    id: "energy-crisis",
    title: "Energy Crisis",
    summary: "Energy and transport prices spike. District 5 and 6 labour receives emergency bonuses.",
    rewardMultiplier: 1,
    workMultiplier: 1.35,
    marketMultiplier: 1.18,
    boostedDistricts: ["District 5", "District 6"],
    alertSeverity: "medium"
  },
  {
    id: "luxury-market-boom",
    title: "Luxury Market Boom",
    summary: "Capitol demand lifts luxury prices, sales work, and prestige speculation.",
    rewardMultiplier: 1,
    workMultiplier: 1.25,
    marketMultiplier: 1.15,
    boostedDistricts: ["The Capitol", "District 1"],
    alertSeverity: "medium"
  },
  {
    id: "state-tax-amnesty",
    title: "State Tax Amnesty",
    summary: "Fines are reduced and suspicious accounts may clear status through prompt payment.",
    rewardMultiplier: 1.1,
    workMultiplier: 1,
    fineMultiplier: 0.65,
    alertSeverity: "low"
  },
  {
    id: "black-market-crackdown",
    title: "Black Market Crackdown",
    summary: "Rare goods surge while smuggling detection rises across the ledger.",
    rewardMultiplier: 1,
    workMultiplier: 1,
    marketMultiplier: 1.22,
    crimeDetectionBonus: 0.12,
    alertSeverity: "high"
  },
  {
    id: "coal-shortage",
    title: "Coal Shortage in District 12",
    summary: "Mine output falls, coal prices rise, and Blackstone Mineral Works enters a volatile emergency cycle.",
    description: "District 12 reports constrained extraction. State buyers bid up industrial fuel while miners earn danger premiums.",
    eventType: "disaster",
    affectedDistricts: ["District 12"],
    affectedCompanies: ["BMW"],
    affectedGoods: ["coal-load"],
    durationHours: 72,
    rewardMultiplier: 1,
    workMultiplier: 1.08,
    marketMultiplier: 1.12,
    boostedDistricts: ["District 12"],
    modifiers: { stockPercent: 0.15, itemPricePercent: 0.25, jobPayoutPercent: 0.2, riskPercent: 0.1, supplyDelta: -18, demandDelta: 12 },
    alertSeverity: "high"
  },
  {
    id: "luxury-boom-capitol",
    title: "Luxury Boom in the Capitol",
    summary: "Capitol demand surges for prestige goods, lifting District 1 companies and luxury prices.",
    description: "Ceremonial purchasing accelerates across elite markets. Luxury dealers receive stronger payouts.",
    eventType: "economic",
    affectedDistricts: ["The Capitol", "District 1"],
    affectedCompanies: ["CLH", "ALG"],
    affectedGoods: ["capitol-silk"],
    durationHours: 96,
    rewardMultiplier: 1.05,
    workMultiplier: 1.12,
    marketMultiplier: 1.15,
    boostedDistricts: ["The Capitol", "District 1"],
    modifiers: { stockPercent: 0.09, itemPricePercent: 0.18, jobPayoutPercent: 0.16, riskPercent: 0.03, supplyDelta: -5, demandDelta: 17 },
    alertSeverity: "medium"
  },
  {
    id: "grain-surplus",
    title: "Grain Surplus Declared",
    summary: "Agricultural reserves exceed projections, softening grain prices and lifting compliant food producers.",
    description: "District 11 and grain offices report strong stores. Food prices ease while harvest work remains active.",
    eventType: "economic",
    affectedDistricts: ["District 9", "District 11"],
    affectedCompanies: ["HUA"],
    affectedGoods: ["grain-sack", "orchard-crate"],
    durationHours: 72,
    rewardMultiplier: 1.05,
    workMultiplier: 1.1,
    marketMultiplier: 0.92,
    boostedDistricts: ["District 9", "District 11"],
    modifiers: { stockPercent: 0.07, itemPricePercent: -0.14, jobPayoutPercent: 0.08, riskPercent: -0.03, supplyDelta: 14, demandDelta: -6 },
    alertSeverity: "low"
  },
  {
    id: "transport-delays",
    title: "Transport Delays Across District 6",
    summary: "Rail delays create shortages, logistics volatility, and temporary freight premiums.",
    description: "Transport bottlenecks raise market friction. District 6 firms become more volatile until routes clear.",
    eventType: "industrial",
    affectedDistricts: ["District 6"],
    affectedCompanies: ["ERL"],
    affectedGoods: ["rail-bearing", "rail-scrap"],
    durationHours: 48,
    workMultiplier: 1.16,
    marketMultiplier: 1.12,
    boostedDistricts: ["District 6"],
    modifiers: { stockPercent: -0.04, itemPricePercent: 0.2, jobPayoutPercent: 0.18, riskPercent: 0.08, supplyDelta: -12, demandDelta: 10 },
    alertSeverity: "medium"
  },
  {
    id: "mss-financial-investigation",
    title: "MSS Financial Investigation Underway",
    summary: "Suspicious trades draw state scrutiny. Restricted sectors fall while crime detection rises.",
    description: "The Ministry of State Security increases financial monitoring and trade reviews.",
    eventType: "mss",
    affectedDistricts: ["The Capitol", "District 1", "District 3"],
    affectedCompanies: ["ALG", "VCT", "PCB"],
    affectedGoods: ["restricted-prototype", "unstable-power-core"],
    durationHours: 48,
    crimeDetectionBonus: 0.18,
    crimePenaltyMultiplier: 1.35,
    marketMultiplier: 1.04,
    modifiers: { stockPercent: -0.11, itemPricePercent: -0.08, jobPayoutPercent: 0, riskPercent: 0.14, supplyDelta: -4, demandDelta: -4 },
    alertSeverity: "high"
  }
];

export const dynamicEconomyEventDefaults = economyEventDefaults.filter((event) => event.modifiers);

export const districtMarketEventDefaults = [
  {
    id: "fishing-fleet-returns",
    title: "Fishing Fleet Returns",
    district: "District 4",
    summary: "Fish supply rises after a successful fleet return.",
    supplyDelta: 14,
    demandDelta: -3
  },
  {
    id: "mine-collapse",
    title: "Mine Collapse",
    district: "District 12",
    summary: "Coal output falls and industrial fuel prices tighten.",
    supplyDelta: -18,
    demandDelta: 8
  },
  {
    id: "luxury-gala",
    title: "Luxury Gala",
    district: "District 1",
    summary: "Capitol gala demand lifts luxury goods.",
    supplyDelta: -5,
    demandDelta: 17
  },
  {
    id: "rail-delays",
    title: "Rail Delays",
    district: "District 6",
    summary: "Transport shortages spread through rail components.",
    supplyDelta: -12,
    demandDelta: 10
  },
  {
    id: "capitol-construction-boom",
    title: "Capitol Construction Boom",
    district: "District 2",
    summary: "Stonework and security material demand accelerates.",
    supplyDelta: -6,
    demandDelta: 15
  },
  {
    id: "electronics-surplus",
    title: "Electronics Surplus",
    district: "District 3",
    summary: "Technology output exceeds projections and prices soften.",
    supplyDelta: 16,
    demandDelta: -6
  }
];

export const inventoryRarityTiers = [
  { id: "common", label: "Common", multiplier: 1, color: "silver" },
  { id: "uncommon", label: "Uncommon", multiplier: 1.8, color: "green" },
  { id: "rare", label: "Rare", multiplier: 3.5, color: "blue" },
  { id: "epic", label: "Epic", multiplier: 7, color: "crimson" },
  { id: "legendary", label: "Legendary", multiplier: 15, color: "gold" }
];

export const craftingQualityTiers = [
  { id: "standard", label: "Standard", valueMultiplier: 1, weight: 62 },
  { id: "refined", label: "Refined", valueMultiplier: 1.35, weight: 24 },
  { id: "advanced", label: "Advanced", valueMultiplier: 1.8, weight: 10 },
  { id: "elite", label: "Elite", valueMultiplier: 2.5, weight: 3.5 },
  { id: "legendary", label: "Legendary", valueMultiplier: 4, weight: 0.5 }
];

export const inventoryItemDefaults = [
  ["fish-crate", "District Fish Crate", "resources", "common", "District 4", 80, 100, false, "Salted catch ready for civic kitchens."],
  ["rare-pearlfish", "Rare Pearlfish", "rare items", "rare", "District 4", 420, 92, false, "A prized coastal catch with collector value."],
  ["legendary-catch", "Legendary Silverfin Catch", "artifacts", "legendary", "District 4", 2400, 96, false, "A ceremonial catch fit for a Capitol display."],
  ["coal-load", "Coal Load", "resources", "common", "District 12", 115, 100, false, "Industrial fuel for approved furnaces."],
  ["ore-cluster", "Dense Ore Cluster", "industrial goods", "uncommon", "District 12", 260, 88, false, "Heavy ore suitable for state refining."],
  ["golden-district-relic", "Golden District Relic", "artifacts", "legendary", "District 12", 3200, 82, false, "A rare relic recovered from old district works."],
  ["grain-sack", "Grain Sack", "resources", "common", "District 9", 70, 100, false, "Union milling grain."],
  ["medicinal-crop", "Medicinal Crop Bundle", "consumables", "uncommon", "District 11", 180, 75, false, "Useful crop bundle for civic supply offices."],
  ["harvest-cache", "Harvest Festival Cache", "rare items", "rare", "District 11", 620, 90, false, "A carefully packed agricultural prize cache."],
  ["timber-bundle", "Timber Bundle", "resources", "common", "District 7", 120, 100, false, "Processed beams for public works."],
  ["heartwood-plank", "Heartwood Plank", "industrial goods", "rare", "District 7", 540, 86, false, "Dense timber valued by builders and collectors."],
  ["rail-scrap", "Rail Scrap", "industrial goods", "common", "District 6", 95, 65, false, "Recovered transport material."],
  ["ancient-rail-artifact", "Ancient Rail Artifact", "artifacts", "epic", "District 6", 1600, 70, false, "A preserved fragment from old transport history."],
  ["circuit-board", "Circuit Board", "technology", "common", "District 3", 140, 80, false, "Functional electronics salvage."],
  ["signal-core", "Signal Core", "technology", "rare", "District 3", 780, 72, false, "A compact relay core used in industrial systems."],
  ["capitol-medallion-fragment", "Capitol Medallion Fragment", "artifacts", "epic", "District 1", 1800, 95, false, "A luxury fragment with prestige applications."],
  ["capitol-silk", "Capitol Silk", "luxury", "uncommon", "District 1", 420, 98, false, "Ceremonial textile for citizens in good standing."],
  ["energy-cell", "Energy Cell", "energy", "common", "District 5", 230, 90, false, "Grid reserve cell for approved exchange."],
  ["industrial-tool", "Industrial Tool", "crafted goods", "uncommon", "District 2", 520, 92, false, "A durable tool kit assembled from lumber and metal."],
  ["luxury-package", "Luxury Package", "crafted goods", "rare", "District 1", 1100, 96, false, "Prestige exports prepared for elite Capitol demand."],
  ["food-supply-crate", "Food Supply Crate", "crafted goods", "uncommon", "District 11", 460, 100, false, "Processed ration stores made from grain and livestock vouchers."],
  ["electronics-module", "Electronics Module", "crafted goods", "uncommon", "District 3", 620, 86, false, "A practical module built from recovered circuitry."],
  ["work-permit", "Foreign Work Permit", "permit", "rare", "The Capitol", 900, 100, false, "Administrative authorization that improves foreign work efficiency."],
  ["contraband-electronics", "Contraband Electronics", "contraband", "rare", "District 3", 980, 55, true, "Unregistered circuit boards and comms parts for underground buyers."],
  ["forged-documents", "Forged Documents", "contraband", "epic", "The Capitol", 1800, 60, true, "Counterfeit permits, badges, and routing papers."],
  ["illegal-energy-cells", "Illegal Energy Cells", "contraband", "rare", "District 5", 1250, 50, true, "Bypassed grid cells sold outside Ministry supervision."],
  ["luxury-black-market-cache", "Luxury Black-Market Cache", "contraband", "epic", "District 1", 2400, 70, true, "Prestige goods routed around Capitol tax offices."],
  ["rare-artifact-cache", "Rare Artifact Cache", "contraband", "legendary", "District 12", 4200, 80, true, "A dangerous relic lot that attracts collectors and MSS attention."],
  ["smuggler-route-pass", "Smuggler Route Pass", "contraband", "rare", "District 6", 1500, 65, true, "A clandestine route marker used to move goods between districts."],
  ["unstable-power-core", "Unstable Power Core", "contraband", "epic", "District 5", 2100, 45, true, "Restricted energy component requiring MSS review."],
  ["restricted-prototype", "Restricted Prototype", "contraband", "legendary", "District 13", 5000, 55, true, "Strategic item under direct state control."]
].map(([id, name, type, rarity, district, baseValue, durability, contraband, description]) => ({
  id,
  name,
  type,
  rarity,
  district,
  baseValue,
  durability,
  contraband,
  description
}));

export const craftingRecipeDefaults = [
  {
    id: "energy-cell",
    name: "Energy Cell",
    district: "District 5",
    category: "Energy",
    outputItemId: "energy-cell",
    outputQuantity: 1,
    materials: [
      { itemId: "coal-load", quantity: 3 },
      { itemId: "circuit-board", quantity: 1 }
    ],
    successChance: 0.78,
    xpReward: 45,
    unlockLevel: 1,
    specialtyBonus: "+20% success chance in District 5",
    description: "Coal and circuitry become portable grid reserve value."
  },
  {
    id: "industrial-tool",
    name: "Industrial Tool",
    district: "District 2",
    secondaryDistricts: ["District 7"],
    category: "Industrial",
    outputItemId: "industrial-tool",
    outputQuantity: 1,
    materials: [
      { itemId: "timber-bundle", quantity: 2 },
      { itemId: "ore-cluster", quantity: 2 }
    ],
    successChance: 0.74,
    xpReward: 55,
    unlockLevel: 2,
    specialtyBonus: "+20% success chance in District 2 or 7",
    description: "Lumber and metal are assembled into higher-value work gear."
  },
  {
    id: "luxury-package",
    name: "Luxury Package",
    district: "District 1",
    category: "Luxury",
    outputItemId: "luxury-package",
    outputQuantity: 1,
    materials: [
      { itemId: "capitol-silk", quantity: 2 },
      { itemId: "capitol-medallion-fragment", quantity: 1 }
    ],
    successChance: 0.68,
    xpReward: 70,
    unlockLevel: 3,
    specialtyBonus: "+20% success chance in District 1",
    description: "Rare textiles and prestige pieces become elite export bundles."
  },
  {
    id: "food-supply-crate",
    name: "Food Supply Crate",
    district: "District 11",
    category: "Food",
    outputItemId: "food-supply-crate",
    outputQuantity: 1,
    materials: [
      { itemId: "grain-sack", quantity: 3 },
      { itemId: "livestock-voucher", quantity: 1 }
    ],
    successChance: 0.82,
    xpReward: 45,
    unlockLevel: 1,
    specialtyBonus: "+20% success chance in District 11",
    description: "Grain and livestock supply are processed into stable ration crates."
  },
  {
    id: "electronics-module",
    name: "Electronics Module",
    district: "District 3",
    category: "Technology",
    outputItemId: "electronics-module",
    outputQuantity: 1,
    materials: [
      { itemId: "circuit-board", quantity: 3 }
    ],
    successChance: 0.76,
    xpReward: 55,
    unlockLevel: 1,
    specialtyBonus: "+20% success chance in District 3",
    description: "Recovered technology becomes a compact industrial module."
  },
  {
    id: "unstable-power-core",
    name: "Unstable Power Core",
    district: "District 5",
    category: "Restricted",
    outputItemId: "unstable-power-core",
    outputQuantity: 1,
    materials: [
      { itemId: "energy-cell", quantity: 2 },
      { itemId: "signal-core", quantity: 1 }
    ],
    successChance: 0.42,
    xpReward: 110,
    unlockLevel: 6,
    restricted: true,
    specialtyBonus: "Restricted craft. MSS monitoring active.",
    description: "A dangerous black-market power core that can trigger MSS review."
  }
];

export const gatheringActionDefaults = [
  {
    id: "fish",
    command: "fish",
    name: "Fishing",
    district: "District 4",
    cooldownHours: 6,
    successChance: 0.88,
    failureText: "The fleet returns light. No usable catch is recorded.",
    riskEvents: [
      { id: "storm-damage", label: "Storm damage", chance: 0.08, creditPenalty: 40, cooldownPenaltyHours: 4 },
      { id: "net-loss", label: "Net loss", chance: 0.06, loseItem: true }
    ],
    drops: [
      { itemId: "fish-crate", chance: 0.7, minQuantity: 1, maxQuantity: 4 },
      { itemId: "rare-pearlfish", chance: 0.2, minQuantity: 1, maxQuantity: 1 },
      { itemId: "legendary-catch", chance: 0.05, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "mine",
    command: "mine",
    name: "Mining",
    district: "District 12",
    cooldownHours: 8,
    successChance: 0.82,
    failureText: "The shaft yields nothing fit for sale.",
    riskEvents: [
      { id: "cave-in", label: "Cave-in", chance: 0.1, creditPenalty: 75, loseItem: true, cooldownPenaltyHours: 6 },
      { id: "illegal-extraction", label: "Illegal extraction review", chance: 0.05, creditPenalty: 120, mssAlert: true }
    ],
    drops: [
      { itemId: "coal-load", chance: 0.64, minQuantity: 1, maxQuantity: 5 },
      { itemId: "ore-cluster", chance: 0.25, minQuantity: 1, maxQuantity: 2 },
      { itemId: "golden-district-relic", chance: 0.04, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "farm",
    command: "farm",
    name: "Farming",
    district: "District 11",
    cooldownHours: 6,
    successChance: 0.9,
    failureText: "The field inspection records no surplus.",
    riskEvents: [{ id: "ration-audit", label: "Ration audit", chance: 0.06, creditPenalty: 35 }],
    drops: [
      { itemId: "grain-sack", chance: 0.62, minQuantity: 2, maxQuantity: 6 },
      { itemId: "medicinal-crop", chance: 0.25, minQuantity: 1, maxQuantity: 3 },
      { itemId: "harvest-cache", chance: 0.06, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "scavenge",
    command: "scavenge",
    name: "Scavenging",
    district: "District 6",
    cooldownHours: 7,
    successChance: 0.78,
    failureText: "The salvage route is stripped clean.",
    riskEvents: [{ id: "rail-collapse", label: "Rail collapse", chance: 0.09, creditPenalty: 55, loseItem: true }],
    drops: [
      { itemId: "rail-scrap", chance: 0.64, minQuantity: 1, maxQuantity: 5 },
      { itemId: "circuit-board", chance: 0.18, minQuantity: 1, maxQuantity: 2 },
      { itemId: "ancient-rail-artifact", chance: 0.05, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "log",
    command: "log",
    name: "Logging",
    district: "District 7",
    cooldownHours: 7,
    successChance: 0.86,
    failureText: "The timber stand is rejected by inspectors.",
    riskEvents: [{ id: "tool-break", label: "Tool break", chance: 0.08, creditPenalty: 45, cooldownPenaltyHours: 3 }],
    drops: [
      { itemId: "timber-bundle", chance: 0.68, minQuantity: 1, maxQuantity: 5 },
      { itemId: "heartwood-plank", chance: 0.16, minQuantity: 1, maxQuantity: 2 }
    ]
  },
  {
    id: "salvage",
    command: "salvage",
    name: "Tech Salvage",
    district: "District 3",
    cooldownHours: 8,
    successChance: 0.8,
    failureText: "No recoverable circuitry survives inspection.",
    riskEvents: [{ id: "terminal-flag", label: "Terminal flag", chance: 0.06, creditPenalty: 80, mssAlert: true }],
    drops: [
      { itemId: "circuit-board", chance: 0.58, minQuantity: 1, maxQuantity: 4 },
      { itemId: "signal-core", chance: 0.18, minQuantity: 1, maxQuantity: 1 },
      { itemId: "restricted-prototype", chance: 0.025, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "source",
    command: "source",
    name: "Luxury Sourcing",
    district: "District 1",
    cooldownHours: 9,
    successChance: 0.76,
    failureText: "The auction house closes before acquisition.",
    riskEvents: [{ id: "luxury-tax-audit", label: "Luxury tax audit", chance: 0.09, creditPenalty: 95 }],
    drops: [
      { itemId: "capitol-silk", chance: 0.52, minQuantity: 1, maxQuantity: 3 },
      { itemId: "capitol-medallion-fragment", chance: 0.08, minQuantity: 1, maxQuantity: 1 }
    ]
  },
  {
    id: "extract",
    command: "extract",
    name: "Energy Extraction",
    district: "District 5",
    cooldownHours: 8,
    successChance: 0.8,
    failureText: "The grid cell fails quality control.",
    riskEvents: [
      { id: "energy-burn", label: "Energy burn", chance: 0.08, creditPenalty: 65, cooldownPenaltyHours: 4 },
      { id: "restricted-core", label: "Restricted core inspection", chance: 0.04, creditPenalty: 140, mssAlert: true }
    ],
    drops: [
      { itemId: "energy-cell", chance: 0.62, minQuantity: 1, maxQuantity: 3 },
      { itemId: "unstable-power-core", chance: 0.06, minQuantity: 1, maxQuantity: 1 }
    ]
  }
];

export const stockCompanyDefaults = [
  ["capitol-luxury-holdings", "Capitol Luxury Holdings", "CLH", "The Capitol", "Luxury / imports", "Capitol luxury import, ceremony, and prestige asset holding group.", 125, 12500000, 1.8, "Stable", 0.018],
  ["panem-credit-bank", "Panem Credit Bank", "PCB", "The Capitol", "Banking", "State-aligned banking institution supporting Panem Credit liquidity.", 88, 22000000, 0.7, "Stable", 0.026],
  ["union-media-bureau", "Union Media Bureau", "UMB", "The Capitol", "Media", "Official communications, broadcast infrastructure, and civic messaging contracts.", 42, 7400000, -0.4, "Moderate", 0.01],
  ["aurelia-luxury-goods", "Aurelia Luxury Goods", "ALG", "District 1", "Luxury goods", "Jewellery, ceremonial fabrics, and premium district exports.", 64, 8100000, 2.4, "Moderate", 0.012],
  ["voltcore-technologies", "VoltCore Technologies", "VCT", "District 3", "Technology", "Circuitry, relays, industrial control systems, and salvaged electronics.", 73, 11800000, 1.2, "Volatile", 0],
  ["trident-maritime-foods", "Trident Maritime Foods", "TMF", "District 4", "Food / maritime", "Fishing fleets, preserved seafood, and maritime ration contracts.", 36, 5400000, 0.5, "Moderate", 0.014],
  ["lemmie-battles-energy", "Lemmie Battles Energy Corporation", "LBE", "District 5", "Energy", "Grid reserves, energy cells, and state power infrastructure.", 112, 26000000, 3.1, "Volatile", 0.03],
  ["eternal-rail-logistics", "Eternal Rail Logistics", "ERL", "District 6", "Transport", "Rail components, route capacity, and inter-district logistics.", 58, 9800000, -1.1, "Moderate", 0.011],
  ["redwood-industrial-timber", "Redwood Industrial Timber", "RIT", "District 7", "Raw materials", "Timber, beams, paper stock, and construction supply.", 44, 6300000, 0.9, "Moderate", 0.009],
  ["loomstate-textiles", "LoomState Textiles", "LST", "District 8", "Textiles", "Uniform cloth, civilian garments, and official banners.", 31, 4100000, -0.2, "Stable", 0.008],
  ["harvest-union-agriculture", "Harvest Union Agriculture", "HUA", "District 11", "Agriculture", "Agricultural output, crop reserves, and medicinal harvests.", 52, 8700000, 1.6, "Stable", 0.018],
  ["blackstone-mineral-works", "Blackstone Mineral Works", "BMW", "District 12", "Mining", "Coal, ore, industrial minerals, and extraction infrastructure.", 47, 7600000, -2.8, "Speculative", 0]
].map(([id, name, ticker, district, sector, description, sharePrice, marketCap, dailyChangePercent, riskLevel, dividendRate]) => ({
  id,
  name,
  ticker,
  district,
  sector,
  description,
  sharePrice,
  marketCap,
  dailyChangePercent,
  riskLevel,
  dividendRate,
  status: "active",
  priceHistory: [
    { date: "2026-04-26", price: Math.max(1, Math.round(sharePrice * 0.97)) },
    { date: "2026-04-27", price: Math.max(1, Math.round(sharePrice * 0.99)) },
    { date: "2026-04-28", price: sharePrice }
  ]
}));

export const stockMarketEventDefaults = [
  { id: "lbe-state-contract", title: "Lemmie Battles Energy awarded new state contract", tickers: ["LBE"], priceImpact: 0.12, district: "District 5", severity: "high" },
  { id: "district-12-accident", title: "District 12 mining accident reported", tickers: ["BMW"], priceImpact: -0.16, district: "District 12", severity: "critical" },
  { id: "luxury-gala-imports", title: "Luxury gala boosts Capitol imports", tickers: ["CLH", "ALG"], priceImpact: 0.09, district: "The Capitol", severity: "medium" },
  { id: "mss-smuggling-investigation", title: "MSS investigation into smuggling network", tickers: ["ALG", "VCT"], priceImpact: -0.11, district: "District 1", severity: "high" },
  { id: "rail-expansion-approved", title: "Rail expansion approved", tickers: ["ERL", "RIT"], priceImpact: 0.1, district: "District 6", severity: "medium" },
  { id: "harvest-surplus-declared", title: "Harvest surplus declared", tickers: ["HUA", "TMF"], priceImpact: 0.07, district: "District 11", severity: "low" },
  { id: "market-crash-alert", title: "Panem Stock Exchange broad correction", tickers: [], priceImpact: -0.08, district: "The Capitol", severity: "critical" },
  { id: "state-investment-drive", title: "State investment drive lifts compliant companies", tickers: ["PCB", "LBE", "HUA"], priceImpact: 0.06, district: "The Capitol", severity: "medium" }
];

export const districtEconomyDefaults = [
  ["The Capitol", "Government administration / treasury command", "State offices, ceremonial goods, credit administration", 92, 88, 97],
  ["District 1", "Luxury goods", "Jewellery, ceremonial fabrics, prestige items", 74, 86, 88],
  ["District 2", "Masonry / weapons / security equipment", "Stonework, armaments, shield gear", 82, 77, 81],
  ["District 3", "Electronics / technology", "Circuitry, radios, industrial control systems", 68, 91, 79],
  ["District 4", "Fish / maritime goods", "Fish, salt stock, maritime equipment", 88, 63, 73],
  ["District 5", "Power / energy credits", "Grid output, storage cells, energy allocations", 79, 94, 84],
  ["District 6", "Transport / rail parts", "Rail components, engine parts, logistics capacity", 71, 80, 76],
  ["District 7", "Lumber", "Timber, paper stock, structural beams", 90, 69, 70],
  ["District 8", "Textiles", "Uniform cloth, civilian garments, banners", 76, 72, 68],
  ["District 9", "Grain", "Wheat, milling output, ration reserves", 84, 78, 74],
  ["District 10", "Livestock", "Meat, hides, draft animals", 73, 66, 69],
  ["District 11", "Agriculture", "Fruit, vegetables, medicinal crops", 87, 82, 72],
  ["District 12", "Coal / minerals", "Coal, ore, industrial minerals", 61, 89, 65],
  ["District 13", "Advanced military/industrial technology", "Restricted prototypes and strategic equipment", 47, 96, 78]
].map(([name, productionType, goodsProduced, supplyLevel, demandLevel, prosperityRating], index) => ({
  id: index === 0 ? "capitol" : `district-${index}`,
  name,
  productionType,
  goodsProduced,
  supplyLevel,
  demandLevel,
  prosperityRating,
  taxContribution: 2500 + index * 330,
  tradeVolume: 9000 + index * 710,
  loyaltyScore: Math.max(54, 96 - index * 2),
  developmentStatus: index === 0 ? "Seat of Government" : index === 13 ? "Restricted Development" : index < 6 ? "Priority Growth" : "Stable Output"
}));

export const marketItemDefaults = [
  ["capitol-silk", "Capitol Silk", "District 1", "Luxury Goods", 420, 32, true, "Ceremonial textile reserved for citizens in good standing."],
  ["peacekeeper-kit", "Peacekeeper Field Kit", "District 2", "Security Equipment", 760, 18, true, "Government-controlled security equipment."],
  ["signal-relay", "Signal Relay", "District 3", "Technology", 540, 26, false, "Short-range industrial communications unit."],
  ["salted-fish", "Salted Fish Crate", "District 4", "Food", 95, 140, false, "Preserved maritime ration stock."],
  ["energy-credit", "Energy Credit Cell", "District 5", "Energy", 230, 80, false, "Transferable grid reserve token."],
  ["rail-bearing", "Rail Bearing Assembly", "District 6", "Transport", 310, 48, false, "Certified component for transport maintenance."],
  ["lumber-bundle", "Lumber Bundle", "District 7", "Raw Materials", 120, 210, false, "Processed beams for public works."],
  ["uniform-cloth", "Uniform Cloth", "District 8", "Textiles", 85, 180, false, "Durable cloth for civic and work uniforms."],
  ["grain-sack", "Grain Sack", "District 9", "Food", 70, 260, false, "Union milling grain."],
  ["livestock-voucher", "Livestock Voucher", "District 10", "Agriculture", 160, 75, false, "Voucher redeemable through district stock offices."],
  ["orchard-crate", "Orchard Crate", "District 11", "Agriculture", 100, 170, false, "Fresh agricultural produce."],
  ["coal-load", "Coal Load", "District 12", "Industrial Fuel", 115, 190, false, "Fuel stock for approved furnaces."],
  ["advanced-alloy", "Advanced Alloy Ingot", "District 13", "Restricted Technology", 1200, 9, true, "Restricted strategic material under state review."]
].map(([id, name, district, category, basePrice, stock, restricted, description]) => ({
  id,
  name,
  district,
  category,
  basePrice,
  currentPrice: basePrice,
  stock,
  restricted,
  rarity: restricted ? "restricted" : stock < 30 ? "rare" : stock > 160 ? "common" : "standard",
  description
}));

export const economyJobDefaults = [
  ["work-shift", "Work Shift", "Any", "Standard civic labour shift.", 45, 95, 8, "Low", 0.04, ["grain-sack"]],
  ["overtime", "Overtime", "Any", "Extended shift with stronger pay and longer recovery.", 90, 180, 18, "Medium", 0.1, ["energy-cell"]],
  ["special-task", "Special Task", "Any", "A limited government assignment with stronger reward variance.", 125, 290, 16, "High", 0.16, ["capitol-medallion-fragment"]],
  ["district-labour", "District Labour", "Any", "Local production assignment with district prosperity bonuses.", 70, 150, 12, "Medium", 0.08, ["timber-bundle"]],
  ["government-contract", "Government Contract", "The Capitol", "Administrative fulfilment for state offices.", 160, 330, 24, "Low", 0.05, ["capitol-silk"]],
  ["trade-route-escort", "Trade Route Escort", "District 6", "Secure a transport route between districts.", 120, 260, 20, "High", 0.14, ["rail-scrap"]],
  ["technical-repair", "Technical Repair", "District 3", "Repair signal, relay, and control equipment.", 115, 245, 16, "Medium", 0.08, ["circuit-board", "signal-core"]],
  ["fishing-expedition", "Fishing Expedition", "District 4", "Join a state-approved fishing fleet.", 85, 210, 14, "Medium", 0.08, ["fish-crate", "rare-pearlfish"]],
  ["mining-operation", "Mining Operation", "District 12", "Complete a coal and mineral extraction run.", 95, 230, 16, "High", 0.16, ["coal-load", "ore-cluster"]],
  ["power-plant-shift", "Power Plant Shift", "District 5", "Operate and stabilize grid output.", 110, 260, 16, "High", 0.15, ["energy-cell", "unstable-power-core"]],
  ["luxury-sales", "Luxury Sales", "District 1", "Move ceremonial goods through licensed channels.", 130, 310, 18, "Medium", 0.09, ["capitol-silk", "capitol-medallion-fragment"]],
  ["capitol-finance", "Capitol Finance Desk", "The Capitol", "Process high-value accounts for the Treasury.", 150, 340, 20, "Low", 0.04, ["capitol-silk"]],
  ["capitol-bureaucrat", "Bureaucrat", "The Capitol", "Process state records and citizen service filings.", 85, 170, 8, "Low", 0.03, ["capitol-silk"]],
  ["capitol-market-analyst", "Market Analyst", "The Capitol", "Study PSE reports and marketplace pressure.", 120, 260, 12, "Medium", 0.07, ["capitol-medallion-fragment"]],
  ["capitol-state-broadcaster", "State Broadcaster", "The Capitol", "Prepare official broadcasts and public notices.", 95, 210, 10, "Low", 0.04, ["capitol-silk"]],
  ["district-1-luxury-dealer", "Luxury Dealer", "District 1", "Broker prestige goods under tax supervision.", 110, 330, 16, "Medium", 0.09, ["capitol-silk", "capitol-medallion-fragment"]],
  ["district-1-jewel-appraiser", "Jewel Appraiser", "District 1", "Inspect high-value goods for state-certified sales.", 100, 280, 14, "Medium", 0.08, ["capitol-medallion-fragment"]],
  ["district-2-security-contractor", "Security Contractor", "District 2", "Support official security material contracts.", 105, 250, 12, "Medium", 0.07, ["peacekeeper-kit"]],
  ["district-2-construction-worker", "Construction Worker", "District 2", "Move stonework and civic construction materials.", 80, 190, 9, "Low", 0.05, ["timber-bundle"]],
  ["district-3-systems-engineer", "Systems Engineer", "District 3", "Repair civic systems and industrial terminals.", 105, 250, 14, "Medium", 0.08, ["circuit-board", "signal-core"]],
  ["district-3-tech-salvager", "Tech Salvager", "District 3", "Recover electronics from approved salvage routes.", 90, 260, 12, "High", 0.14, ["circuit-board", "restricted-prototype"]],
  ["district-4-fisher", "Fisher", "District 4", "Serve on a fishing fleet.", 80, 220, 10, "Medium", 0.08, ["fish-crate", "rare-pearlfish"]],
  ["district-4-deep-sea-hunter", "Deep Sea Hunter", "District 4", "Take dangerous fleet routes for rare catches.", 125, 340, 16, "High", 0.18, ["rare-pearlfish", "legendary-catch"]],
  ["district-5-reactor-technician", "Reactor Technician", "District 5", "Maintain grid systems and power infrastructure.", 120, 310, 14, "High", 0.15, ["energy-cell", "unstable-power-core"]],
  ["district-5-energy-distributor", "Energy Distributor", "District 5", "Move certified energy allocations.", 95, 230, 10, "Medium", 0.08, ["energy-cell"]],
  ["district-6-rail-operator", "Rail Operator", "District 6", "Run scheduled inter-district freight routes.", 95, 230, 10, "Medium", 0.08, ["rail-scrap"]],
  ["district-6-freight-handler", "Freight Handler", "District 6", "Load and account for district cargo.", 75, 190, 8, "Low", 0.05, ["rail-scrap"]],
  ["district-7-lumberjack", "Lumberjack", "District 7", "Process timber in state-approved stands.", 90, 230, 10, "Medium", 0.09, ["timber-bundle", "heartwood-plank"]],
  ["district-7-forestry-surveyor", "Forestry Surveyor", "District 7", "Survey stands for high-grade timber.", 80, 210, 10, "Low", 0.05, ["heartwood-plank"]],
  ["district-8-textile-worker", "Textile Worker", "District 8", "Produce civic cloth and district uniforms.", 70, 175, 8, "Low", 0.04, ["uniform-cloth"]],
  ["district-8-fabric-designer", "Fabric Designer", "District 8", "Prepare ceremonial fabric patterns.", 90, 220, 10, "Medium", 0.07, ["uniform-cloth", "capitol-silk"]],
  ["district-9-grain-farmer", "Grain Farmer", "District 9", "Harvest and mill grain reserves.", 75, 190, 8, "Low", 0.04, ["grain-sack"]],
  ["district-9-storage-manager", "Storage Manager", "District 9", "Manage ration reserve storage.", 85, 210, 10, "Low", 0.05, ["grain-sack"]],
  ["district-10-livestock-handler", "Livestock Handler", "District 10", "Handle state livestock vouchers.", 75, 200, 9, "Medium", 0.07, ["livestock-voucher"]],
  ["district-10-meat-processor", "Meat Processor", "District 10", "Process ration supply orders.", 80, 205, 9, "Medium", 0.06, ["livestock-voucher"]],
  ["district-11-harvester", "Harvester", "District 11", "Gather agricultural goods for state reserves.", 80, 210, 8, "Low", 0.05, ["grain-sack", "medicinal-crop"]],
  ["district-11-plantation-supervisor", "Plantation Supervisor", "District 11", "Coordinate harvest teams and reserve audits.", 100, 245, 12, "Medium", 0.07, ["harvest-cache"]],
  ["district-12-miner", "Miner", "District 12", "Extract coal and ore.", 100, 300, 14, "High", 0.16, ["coal-load", "ore-cluster"]],
  ["district-12-tunnel-engineer", "Tunnel Engineer", "District 12", "Stabilise shafts and improve mine output.", 120, 310, 16, "High", 0.14, ["ore-cluster", "golden-district-relic"]],
  ["district-13-weapons-engineer", "Weapons Engineer", "District 13", "Restricted strategic engineering work.", 160, 420, 20, "Restricted", 0.22, ["restricted-prototype"]],
  ["district-13-intelligence-technician", "Intelligence Technician", "District 13", "Restricted systems and signal analysis.", 145, 390, 18, "Restricted", 0.2, ["signal-core", "restricted-prototype"]]
].map(([id, name, district, description, minReward, maxReward, cooldownHours, riskLevel, failureChance, itemRewards]) => ({
  id,
  name,
  district,
  description,
  minReward,
  maxReward,
  cooldownHours,
  riskLevel,
  failureChance,
  itemRewards,
  switchCooldownHours: 24,
  illegalOpportunityChance: riskLevel === "High" || riskLevel === "Restricted" ? 0.08 : riskLevel === "Medium" ? 0.04 : 0.015
}));

export const economyCrimeDefaults = [
  ["pickpocket", "Pickpocket", "Quick street theft with modest upside.", 0.68, 25, 95, 45, 0.18, 4],
  ["rob-citizen", "Rob Citizen", "Target another wallet and risk an MSS alert.", 0.55, 80, 240, 140, 0.3, 12],
  ["smuggle-goods", "Smuggle Goods", "Move restricted goods outside official exchange.", 0.48, 140, 380, 210, 0.38, 18],
  ["tax-evasion", "Tax Evasion", "Attempt to dodge state levy review.", 0.52, 100, 310, 260, 0.42, 24],
  ["black-market-trade", "Black Market Trade", "Speculate on unlicensed rare goods.", 0.44, 180, 520, 320, 0.45, 24],
  ["counterfeit-credits", "Counterfeit Credits", "Forgery attempt against Panem Credit controls.", 0.36, 240, 760, 460, 0.55, 36],
  ["hack-treasury-terminal", "Hack Treasury Terminal", "Reckless intrusion into Ministry finance systems.", 0.24, 420, 1300, 850, 0.72, 48]
].map(([id, name, description, successChance, minReward, maxReward, penalty, detectionChance, cooldownHours]) => ({
  id,
  name,
  description,
  successChance,
  minReward,
  maxReward,
  penalty,
  detectionChance,
  cooldownHours
}));

export const blackMarketGoodsDefaults = [
  ["contraband-electronics", "Contraband Electronics", "District 3", "technology", "rare", 980, 5, 0.32, "Unregistered circuit boards and comms parts for underground buyers."],
  ["forged-documents", "Forged Documents", "The Capitol", "documents", "epic", 1800, 3, 0.46, "Counterfeit permits, badges, and routing papers. Extremely illegal."],
  ["illegal-energy-cells", "Illegal Energy Cells", "District 5", "energy", "rare", 1250, 4, 0.38, "Bypassed grid cells sold outside Ministry supervision."],
  ["luxury-black-market-cache", "Luxury Black-Market Cache", "District 1", "luxury", "epic", 2400, 2, 0.42, "Prestige goods routed around Capitol tax offices."],
  ["rare-artifact-cache", "Rare Artifact Cache", "District 12", "artifacts", "legendary", 4200, 1, 0.55, "A dangerous relic lot that attracts collectors and MSS attention."],
  ["smuggler-route-pass", "Smuggler Route Pass", "District 6", "permit", "rare", 1500, 3, 0.36, "A clandestine route marker used to move goods between districts."]
].map(([id, name, district, category, rarity, price, stock, detectionChance, description]) => ({
  id,
  name,
  district,
  category,
  rarity,
  price,
  stock,
  detectionChance,
  description,
  restricted: true
}));

export const economyGambleDefaults = [
  ["coin-toss", "Coin Toss", "Simple double-or-nothing wager.", 10, 500, 0.49, 2, 2],
  ["dice-table", "Dice Table", "District dice with steady risk.", 20, 900, 0.38, 2.6, 4],
  ["capitol-roulette", "Capitol Roulette", "Elegant, brutal, and very Capitol.", 25, 1500, 0.31, 3.2, 6],
  ["number-draw", "Number Draw", "Pick the number the Treasury smiles upon.", 10, 750, 0.22, 4.5, 4],
  ["lucky-crate", "Lucky Crate", "Open a state mystery crate for prize or disappointment.", 35, 1200, 0.42, 2.1, 8],
  ["beast-race", "Beast Race Betting", "Back a district racing beast in a controlled spectacle.", 50, 2000, 0.28, 3.8, 8],
  ["district-lottery", "District Lottery", "Low-cost ticket with jackpot dreams.", 5, 250, 0.08, 14, 12]
].map(([id, name, description, minBet, maxBet, winChance, payoutMultiplier, cooldownHours]) => ({
  id,
  name,
  description,
  minBet,
  maxBet,
  winChance,
  payoutMultiplier,
  cooldownHours
}));

export const investmentFundDefaults = [
  ["district-bonds", "District Bonds", "Safe", "State-backed district development notes.", 0.015, 0.045, 0.04],
  ["power-grid-fund", "Power Grid Fund", "Balanced", "Energy output and grid reserve financing.", 0.03, 0.08, 0.12],
  ["capitol-property-trust", "Capitol Property Trust", "Balanced", "Prestige real estate lease portfolio.", 0.025, 0.095, 0.16],
  ["grain-reserve-fund", "Grain Reserve Fund", "Safe", "Food reserve stabilization pool.", 0.01, 0.04, 0.03],
  ["rail-expansion-fund", "Rail Expansion Fund", "High Risk", "Transport expansion and route modernization.", 0.04, 0.14, 0.22],
  ["rare-goods-syndicate", "Rare Goods Syndicate", "Speculative", "Volatile luxury and restricted materials exposure.", 0.08, 0.26, 0.38]
].map(([id, name, riskLevel, description, minReturn, maxReturn, lossChance]) => ({
  id,
  name,
  riskLevel,
  description,
  minReturn,
  maxReturn,
  lossChance
}));

export const prestigeItemDefaults = [
  ["district-apartment", "Apartment", "Civic Tenant", 1200, "Modest passive civic rent allowance.", 8],
  ["district-home", "District Home", "Established Citizen", 4200, "District status and weekly household rebate.", 25],
  ["capitol-penthouse", "Capitol Penthouse", "Capitol Magnate", 28000, "Elite profile title and higher passive income.", 130],
  ["private-rail-car", "Private Rail Car", "Rail Patron", 18000, "Transport prestige and district trade priority.", 80],
  ["luxury-watch", "Luxury Watch", "Ceremonial Collector", 7500, "Prestige badge for luxury market circles.", 25],
  ["golden-passport", "Golden Passport", "Golden Passport Holder", 50000, "Top-tier profile badge and lower trade tax note.", 160],
  ["royal-guard-escort", "Royal Guard Escort", "Guarded Benefactor", 35000, "Security title and public status display.", 120],
  ["ceremony-tickets", "Ceremony Tickets", "Ceremony Patron", 2500, "Public ceremony status and small passive income.", 12]
].map(([id, name, title, price, benefit, passiveIncome]) => ({
  id,
  name,
  title,
  price,
  benefit,
  passiveIncome
}));

export const economyTitles = [
  { minBalance: 250000, title: "Capitol Magnate" },
  { minBalance: 150000, title: "Industrial Baron" },
  { minBalance: 100000, title: "Treasury Favourite" },
  { minBalance: 50000, title: "State Benefactor" },
  { minBalance: 25000, title: "District Magnate" },
  { minBalance: 10000, title: "Industrial Patron" },
  { minBalance: 2500, title: "Loyal Taxpayer" }
];

export function formatCredits(value) {
  const amount = Number(value || 0);
  return `${currencySymbol} ${amount.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2
  })}`;
}

export function titleForBalance(balance) {
  return economyTitles.find((item) => Number(balance || 0) >= item.minBalance)?.title || "Registered Citizen";
}

export function taxLabel(taxType) {
  return taxTypes.find((item) => item.id === taxType)?.label || String(taxType || "Tax");
}

export function calculateMarketPrice(item, district) {
  const base = Number(item?.basePrice || item?.currentPrice || 0);
  const supply = Number(district?.supplyLevel || 70);
  const demand = Number(district?.demandLevel || 70);
  const pressure = 1 + (demand - supply) / 220;
  const stockPressure = Math.max(0.82, Math.min(1.28, 1 + (50 - Number(item?.stock || 0)) / 260));
  return Math.max(1, Math.round(base * pressure * stockPressure));
}
