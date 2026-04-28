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
  description
}));

export const economyTitles = [
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
