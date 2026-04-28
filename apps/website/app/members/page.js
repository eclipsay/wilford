import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCitizenState } from "../../lib/citizen-state";

const directory = [
  {
    section: "Chairman Lemmie",
    people: [
      {
        name: "Chairman Lemmie",
        title: "Supreme Chairman",
        portrait: "/chairman-lemmie-portrait.png",
        portraitClassName: "people-card__image people-card__image--portrait",
        bio: "Founder and final authority of the Wilford Panem Union.",
        motto: "Build the future. Command the present."
      }
    ]
  },
  {
    section: "Senior Leadership",
    people: [
      {
        name: "Executive Director Eclip",
        title: "Executive Director of Union Administration",
        portrait: "/EclipPortrait.png",
        portraitClassName: "people-card__image people-card__image--portrait",
        bio: "Coordinates the ministries and ensures state doctrine becomes operational policy.",
        motto: "Directive becomes action."
      },
      {
        name: "First Minister Sir Flukkston",
        title: "First Minister of State Vision and National Development",
        portrait: "/SirFluk.png",
        portraitClassName: "people-card__image people-card__image--portrait",
        bio:
          "Chief adviser to Chairman Lemmie and equal executive authority alongside Executive Director Eclip. Guides long-term national vision, ceremonial affairs, elite appointments, and the future direction of the Union.",
        motto: "Vision secures the future."
      }
    ]
  },
  {
    section: "Ministers",
    people: [
      ["Minister of State Security", "Oversees intelligence, stability, and executive protection.", "Vigilance preserves unity."],
      ["Minister of Order", "Commands civic law, public discipline, and district enforcement.", "Order shields the people."],
      ["Minister of Production", "Directs labour, manufacturing, and national output.", "Industry serves destiny."]
    ].map(([name, bio, motto]) => ({
      name,
      title: "Cabinet Ministry",
      portrait: "/wpu-grand-seal.png",
      bio,
      motto
    }))
  },
  {
    section: "Security Commanders",
    people: [
      ["Director of Executive Protection", "Maintains the Chairman's protective cordon and ceremonial guard.", "The center must hold."],
      ["Chief of Cyber Monitoring", "Supervises digital watch systems and anti-subversion signals.", "No threat goes unseen."]
    ].map(([name, bio, motto]) => ({
      name,
      title: "Security Command",
      portrait: "/wpu-grand-seal.png",
      bio,
      motto
    }))
  },
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MembersPage() {
  const state = await getCitizenState();
  const directoryWithGovernors = [
    ...directory,
    {
      section: "District Governors",
      people: state.districtProfiles.map((district) => ({
        name: district.governorName,
        title: district.governorTitle,
        portrait: district.governorPortrait || "/wpu-grand-seal.png",
        bio: district.governorBiography,
        motto: district.loyaltyStatement
      }))
    }
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="State Directory"
        title="The People"
        description="Leadership, ministries, security command, and district authority of the Wilford Panem Union."
      />

      <main className="content content--wide people-directory">
        {directoryWithGovernors.map((group) => (
          <section className="state-section scroll-fade" key={group.section}>
            <p className="eyebrow">Official Register</p>
            <h2>{group.section}</h2>
            <div className="people-grid">
              {group.people.map((person) => (
                <article className="people-card" key={person.name}>
                  <div className="people-card__portrait">
                    <Image
                      src={person.portrait}
                      alt={`${person.portraitClassName ? "Official portrait" : "Official seal"} of ${person.name}`}
                      width={420}
                      height={520}
                      className={person.portraitClassName || "people-card__image"}
                    />
                  </div>
                  <div className="people-card__body">
                    <p>{person.title}</p>
                    <h3>{person.name}</h3>
                    <span>{person.bio}</span>
                    <strong>{person.motto}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </SiteLayout>
  );
}
