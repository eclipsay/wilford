import Image from "next/image";
import { SiteLayout } from "../../components/SiteLayout";
import { getCitizenState } from "../../lib/citizen-state";

const ministries = [
  {
    name: "Ministry of State Security",
    label: "MSS",
    prominent: true,
    purpose:
      "Responsible for intelligence, internal stability, anti-subversion, executive protection, cyber monitoring, and strategic security.",
    motto: "Vigilance Preserves Unity."
  },
  {
    name: "Ministry of Order",
    label: "Order",
    purpose: "Public law, policing, discipline, and district enforcement.",
    motto: "Order Shields The People."
  },
  {
    name: "Ministry of Production",
    label: "Industry",
    purpose: "Industry, labour, manufacturing, and expansion.",
    motto: "Labour Builds The Future."
  },
  {
    name: "Ministry of Faith & Unity",
    label: "Unity",
    purpose: "Culture, education, ideology, and national identity.",
    motto: "Faith Binds The Union."
  },
  {
    name: "Ministry of Credit & Records",
    label: "Credit",
    purpose: "Panem Credit, taxation, data, census, and identity systems.",
    motto: "Every Citizen Verified."
  },
  {
    name: "Ministry of Transport",
    label: "Rail",
    purpose: "Rail command, roads, logistics, and Snowpiercer operations.",
    motto: "The Union Moves As One."
  },
  {
    name: "Ministry of Public Works",
    label: "Works",
    purpose: "Housing, infrastructure, monuments, and district rebuilding.",
    motto: "Stone, Steel, Service."
  }
];

const principles = ["Faith", "Order", "Service", "Unity"];

const executives = [
  {
    name: "Executive Director Eclip",
    rank: "Executive Director",
    subtitle: "Executive Director of Union Administration",
    description:
      "Oversees ministry execution, district governance, national logistics, administration, and implementation of the Chairman's directives. Responsible for day-to-day operation of the Union state.",
    image: "/EclipPortrait.png",
    imageAlt: "Official portrait of Executive Director Eclip",
    imageClassName: "portrait-frame portrait-frame--official"
  },
  {
    name: "First Minister Sir Flukkston",
    rank: "Executive Director",
    subtitle: "First Minister of State Vision and National Development",
    description:
      "Chief advisor to Chairman Lemmie and equal executive authority alongside Director Eclip. Guides long-term national vision, state philosophy, ceremonial affairs, elite appointments, and future direction of the Union.",
    image: "/SirFluk.png",
    imageAlt: "Official portrait of First Minister Sir Flukkston",
    imageClassName: "portrait-frame"
  }
];

export const metadata = {
  title: "Government of the Wilford Panem Union"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GovernmentPage() {
  const state = await getCitizenState();
  const governorPreview = state.districtProfiles.slice(0, 6);

  return (
    <SiteLayout>
      <main className="government-page">
        <section className="government-hero scroll-fade" aria-labelledby="government-title">
          <div className="government-hero__copy">
            <p className="government-hero__eyebrow">Union Administration</p>
            <h1 id="government-title">Government Of The Wilford Panem Union</h1>
            <p className="government-hero__intro">
              The official hierarchy of state authority, operating under the
              Grand Seal and the direct command of Chairman Lemmie.
            </p>
          </div>
          <div className="government-hero__seal" aria-hidden="true">
            <Image
              className="grand-seal"
              src="/wpu-grand-seal.png"
              alt=""
              width={640}
              height={640}
              priority
            />
          </div>
        </section>

        <section className="government-chart scroll-fade" aria-label="Government hierarchy">
          <article className="government-office government-office--chairman">
            <div className="government-office__portrait">
              <Image
                src="/chairman-lemmie-portrait.png"
                alt="Official portrait of Chairman Lemmie"
                width={1122}
                height={1402}
                className="portrait-frame"
              />
            </div>
            <div>
              <p className="government-office__rank">Supreme Chairman</p>
              <h2>Chairman Lemmie</h2>
              <strong>Founder and Supreme Chairman</strong>
              <p>
                Final authority over the Union, its ministries, districts,
                security commands, and national doctrine.
              </p>
            </div>
          </article>

          <div className="government-executive-tier" aria-label="Senior executive command">
            {executives.map((executive) => (
              <article className="government-office government-office--executive" key={executive.name}>
                <div className="government-office__portrait government-office__portrait--executive">
                  <Image
                    src={executive.image}
                    alt={executive.imageAlt}
                    width={420}
                    height={520}
                    className={executive.imageClassName}
                  />
                </div>
                <div>
                  <p className="government-office__rank">{executive.rank}</p>
                  <h2>{executive.name}</h2>
                  <strong>{executive.subtitle}</strong>
                  <p>{executive.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="government-command-statement">
            <p className="government-office__rank">Dual Executive Command</p>
            <blockquote>
              The Union is administered through twin pillars of state authority:
              governance and vision.
            </blockquote>
          </div>

          <div className="government-ministries">
            {ministries.map((ministry) => (
              <article
                className={`government-ministry${ministry.prominent ? " government-ministry--mss" : ""}`}
                key={ministry.name}
              >
                <p className="government-office__rank">{ministry.label}</p>
                <h3>{ministry.name}</h3>
                <p>{ministry.purpose}</p>
                <strong>{ministry.motto}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="government-principles scroll-fade" aria-labelledby="government-principles-title">
          <div className="government-section-heading">
            <p className="government-hero__eyebrow">Civic Doctrine</p>
            <h2 id="government-principles-title">Principles Of Governance</h2>
          </div>

          <div className="government-principles__grid">
            {principles.map((principle) => (
              <article className="government-principle" key={principle}>
                <span aria-hidden="true">{principle[0]}</span>
                <strong>{principle}</strong>
                <p>Preserves The Union</p>
              </article>
            ))}
          </div>
        </section>

        <section className="government-principles scroll-fade" aria-labelledby="district-admin-title">
          <div className="government-section-heading">
            <p className="government-hero__eyebrow">District Administration</p>
            <h2 id="district-admin-title">Governor Council</h2>
          </div>

          <div className="government-principles__grid">
            {governorPreview.map((district) => (
              <article className="government-principle" key={district.id}>
                <span aria-hidden="true">{district.name === "Capitol" ? "C" : district.name.replace(/\D/g, "")}</span>
                <strong>{district.governorName}</strong>
                <p>{district.name}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
