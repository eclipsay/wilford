import Image from "next/image";
import { SiteLayout } from "../../components/SiteLayout";

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

export const metadata = {
  title: "Government of the Wilford Panem Union"
};

export default function GovernmentPage() {
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
              <p className="government-office__rank">Supreme Authority</p>
              <h2>Chairman Lemmie</h2>
              <strong>Founder and Supreme Chairman</strong>
              <p>
                Final authority over the Union, its ministries, districts,
                security commands, and national doctrine.
              </p>
            </div>
          </article>

          <article className="government-office government-office--executive">
            <p className="government-office__rank">Executive Command</p>
            <h2>Executive Director Eclip</h2>
            <strong>Executive Director of Union Administration</strong>
            <p>
              Coordinates ministry execution, district governance, and the
              implementation of the Chairman&apos;s directives.
            </p>
          </article>

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
      </main>
    </SiteLayout>
  );
}
