import Image from "next/image";
import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCitizenState } from "../../lib/citizen-state";
import { getGovernorProfiles, institutionProfiles, leadershipProfiles } from "../../lib/people";

const directory = [
  {
    section: "Chairman Lemmie",
    people: [leadershipProfiles[0]]
  },
  {
    section: "Senior Leadership",
    people: leadershipProfiles.slice(1)
  },
  {
    section: "Ministers",
    people: institutionProfiles.slice(0, 3)
  },
  {
    section: "Security Commanders",
    people: institutionProfiles.slice(3)
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
      people: getGovernorProfiles(state.districtProfiles)
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
                <Link
                  className={`people-card${person.isCapitolGovernor ? " people-card--capitol-governor" : ""}`}
                  href={person.href}
                  key={person.name}
                >
                  <div className="people-card__portrait">
                    <Image
                      src={person.portrait}
                      alt={`${person.portrait.includes("wpu-grand-seal") ? "Official seal" : "Official portrait"} of ${person.name}`}
                      width={420}
                      height={520}
                      className={`people-card__image${person.portrait.includes("wpu-grand-seal") ? "" : " people-card__image--portrait"}`}
                    />
                  </div>
                  <div className="people-card__body">
                    {person.isCapitolGovernor ? <span className="capitol-prestige-badge">Capitol High Office</span> : null}
                    <p>{person.title}</p>
                    <h3>{person.name}</h3>
                    <span>{person.bio}</span>
                    <strong>{person.motto}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </SiteLayout>
  );
}
