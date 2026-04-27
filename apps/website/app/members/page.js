import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const directory = [
  {
    section: "Chairman Lemmie",
    people: [
      {
        name: "Chairman Lemmie",
        title: "Supreme Chairman",
        portrait: "/chairman-lemmie-portrait.png",
        bio: "Founder and final authority of the Wilford Panem Union.",
        motto: "Build the future. Command the present."
      }
    ]
  },
  {
    section: "Executive Director Eclip",
    people: [
      {
        name: "Executive Director Eclip",
        title: "Executive Director of Union Administration",
        portrait: "/wpu-grand-seal.png",
        bio: "Coordinates the ministries and ensures state doctrine becomes operational policy.",
        motto: "Directive becomes action."
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
  {
    section: "District Governors",
    people: [
      ["Capitol Governor", "Maintains ceremonial administration and central civic order.", "The Capitol reflects the Union."],
      ["District Governor Council", "Coordinates production, housing, transport, and citizen records.", "Every district has purpose."]
    ].map(([name, bio, motto]) => ({
      name,
      title: "District Authority",
      portrait: "/wpu-grand-seal.png",
      bio,
      motto
    }))
  }
];

export default function MembersPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="State Directory"
        title="The People"
        description="Leadership, ministries, security command, and district authority of the Wilford Panem Union."
      />

      <main className="content content--wide people-directory">
        {directory.map((group) => (
          <section className="state-section scroll-fade" key={group.section}>
            <p className="eyebrow">Official Register</p>
            <h2>{group.section}</h2>
            <div className="people-grid">
              {group.people.map((person) => (
                <article className="people-card" key={person.name}>
                  <div className="people-card__portrait">
                    <Image
                      src={person.portrait}
                      alt={`Official portrait or seal for ${person.name}`}
                      width={420}
                      height={520}
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
