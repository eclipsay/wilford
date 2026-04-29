export const currencyName = "Panem Credit";
export const currencySymbol = "PC";

export const taxTypes = [
  { id: "income_tax", label: "Income Tax", defaultRate: 0.08 },
  { id: "trade_tax", label: "Trade Tax", defaultRate: 0.05 },
  { id: "district_levy", label: "District Levy", defaultRate: 0.03 },
  { id: "emergency_state_levy", label: "Emergency State Levy", defaultRate: 0.02 },
  { id: "luxury_goods_tax", label: "Luxury Goods Tax", defaultRate: 0.12 }
];

export const walletStatuses = ["active", "frozen", "restricted"];

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
  }
];

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
  ["work-shift", "Work Shift", "Any", "Standard civic labour shift.", 45, 95, 8],
  ["overtime", "Overtime", "Any", "Extended shift with stronger pay and longer recovery.", 90, 180, 18],
  ["district-labour", "District Labour", "Any", "Local production assignment with district prosperity bonuses.", 70, 150, 12],
  ["government-contract", "Government Contract", "The Capitol", "Administrative fulfilment for state offices.", 160, 330, 24],
  ["trade-route-escort", "Trade Route Escort", "District 6", "Secure a transport route between districts.", 120, 260, 20],
  ["technical-repair", "Technical Repair", "District 3", "Repair signal, relay, and control equipment.", 115, 245, 16],
  ["fishing-expedition", "Fishing Expedition", "District 4", "Join a state-approved fishing fleet.", 85, 210, 14],
  ["mining-operation", "Mining Operation", "District 12", "Complete a coal and mineral extraction run.", 95, 230, 16],
  ["power-plant-shift", "Power Plant Shift", "District 5", "Operate and stabilize grid output.", 110, 260, 16],
  ["luxury-sales", "Luxury Sales", "District 1", "Move ceremonial goods through licensed channels.", 130, 310, 18],
  ["capitol-finance", "Capitol Finance Desk", "The Capitol", "Process high-value accounts for the Treasury.", 150, 340, 20]
].map(([id, name, district, description, minReward, maxReward, cooldownHours]) => ({
  id,
  name,
  district,
  description,
  minReward,
  maxReward,
  cooldownHours
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
