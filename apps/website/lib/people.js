import { districtSlug, personSlug } from "./citizen-state";

export const leadershipProfiles = [
  {
    name: "Chairman Lemmie",
    title: "Supreme Chairman",
    portrait: "/chairman-lemmie-portrait.png",
    bio: "Founder and final authority of the Wilford Panem Union.",
    officialRole: "Supreme leadership and final state authority",
    district: "The Capitol",
    districtHref: "/districts/capitol",
    href: "/chairman",
    motto: "Build the future. Command the present."
  },
  {
    name: "Executive Director Eclip",
    title: "Executive Director of Union Administration",
    portrait: "/EclipPortrait.png",
    bio: "Coordinates the ministries and ensures state doctrine becomes operational policy.",
    officialRole: "Executive leadership and ministry administration",
    district: "District 3",
    districtHref: "/districts/district-3",
    href: "/people/executive-director-eclip",
    motto: "Directive becomes action."
  },
  {
    name: "First Minister Sir Flukkston",
    title: "First Minister of State Vision and National Development",
    portrait: "/SirFluk.png",
    bio:
      "Chief adviser to Chairman Lemmie and equal executive authority alongside Executive Director Eclip. Guides long-term national vision, ceremonial affairs, elite appointments, and the future direction of the Union.",
    officialRole: "Executive leadership, state vision, and national development",
    district: "District 2",
    districtHref: "/districts/district-2",
    href: "/people/first-minister-sir-flukkston",
    motto: "Vision secures the future."
  }
];

export const institutionProfiles = [
  {
    name: "Minister of State Security",
    title: "Cabinet Ministry",
    portrait: "/wpu-grand-seal.png",
    bio: "Oversees intelligence, stability, and executive protection.",
    officialRole: "Ministry of State Security command",
    district: "The Capitol",
    districtHref: "/districts/capitol",
    href: "/people/minister-of-state-security",
    motto: "Vigilance preserves unity."
  },
  {
    name: "Minister of Order",
    title: "Cabinet Ministry",
    portrait: "/wpu-grand-seal.png",
    bio: "Commands civic law, public discipline, and district enforcement.",
    officialRole: "Public order and district enforcement",
    district: "The Capitol",
    districtHref: "/districts/capitol",
    href: "/people/minister-of-order",
    motto: "Order shields the people."
  },
  {
    name: "Minister of Production",
    title: "Cabinet Ministry",
    portrait: "/wpu-grand-seal.png",
    bio: "Directs labour, manufacturing, and national output.",
    officialRole: "Industrial production and labour direction",
    district: "The Capitol",
    districtHref: "/districts/capitol",
    href: "/people/minister-of-production",
    motto: "Industry serves destiny."
  },
  {
    name: "Director of Executive Protection",
    title: "Security Command",
    portrait: "/wpu-grand-seal.png",
    bio: "Maintains the Chairman's protective cordon and ceremonial guard.",
    officialRole: "Executive protection and ceremonial guard command",
    district: "The Capitol",
    districtHref: "/districts/capitol",
    href: "/people/director-of-executive-protection",
    motto: "The center must hold."
  },
  {
    name: "Chief of Cyber Monitoring",
    title: "Security Command",
    portrait: "/wpu-grand-seal.png",
    bio: "Supervises digital watch systems and anti-subversion signals.",
    officialRole: "Digital watch systems and anti-subversion monitoring",
    district: "District 3",
    districtHref: "/districts/district-3",
    href: "/people/chief-of-cyber-monitoring",
    motto: "No threat goes unseen."
  }
];

export function governorProfileFromDistrict(district) {
  const slug = personSlug(district.governorName);
  const territory = district.canonicalName === "The Capitol" ? "The Capitol" : district.name;

  return {
    name: district.governorName,
    title: district.governorTitle,
    portrait: district.governorPortrait || "/wpu-grand-seal.png",
    bio: district.governorBiography,
    officialRole: district.loreNote || `Civil administration of ${territory}`,
    district: territory,
    districtHref: `/districts/${districtSlug(district)}`,
    href: `/people/${slug}`,
    motto: district.loyaltyStatement,
    isCapitolGovernor: district.name === "Capitol" || district.canonicalName === "The Capitol"
  };
}

export function getGovernorProfiles(districtProfiles = []) {
  return districtProfiles.map(governorProfileFromDistrict);
}

export function getPeopleProfiles(districtProfiles = []) {
  return [...leadershipProfiles, ...institutionProfiles, ...getGovernorProfiles(districtProfiles)];
}
