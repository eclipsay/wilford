import Link from "next/link";
import Image from "next/image";
import { SiteLayout } from "../../components/SiteLayout";

const ministries = [
  {
    name: "Ministry of Order",
    head: "Director of Civic Security",
    purpose:
      "Oversees law enforcement, internal security, public discipline, and protection of the Union."
  },
  {
    name: "Ministry of Production",
    head: "Director of Industry and Labour",
    purpose:
      "Manages factories, infrastructure, logistics, district output, and national resource planning."
  },
  {
    name: "Ministry of Faith and Unity",
    head: "High Steward of Civic Devotion",
    purpose:
      "Maintains religious symbolism, ceremonies, public loyalty, education, and national identity."
  },
  {
    name: "Ministry of Credit and Records",
    head: "Commissioner of Panem Credit",
    purpose:
      "Oversees digital currency, citizen records, permits, taxation, and state access systems."
  }
];

const principles = [
  { icon: "F", name: "Faith", vow: "Our Guide" },
  { icon: "O", name: "Order", vow: "Our Shield" },
  { icon: "S", name: "Service", vow: "Our Duty" },
  { icon: "U", name: "Unity", vow: "Our Strength" }
];

export const metadata = {
  title: "Government of the Wilford Panem Union"
};

export default function GovernmentPage() {
  return (
    <SiteLayout>
      <main className="government-page">
        <section className="government-hero" aria-labelledby="government-title">
          <div className="government-hero__copy">
            <p className="government-hero__eyebrow">Union Administration</p>
            <h1 id="government-title">Government of the Wilford Panem Union</h1>
            <p className="government-hero__intro">
              Official authority of the Union under Chairman Lemmie.
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

        <section className="government-chart" aria-label="Government hierarchy">
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
              <strong>Supreme Chairman of the Wilford Panem Union</strong>
              <p>
                Founder, Leader, and Eternal Steward of the Union. Chairman
                Lemmie embodies the will of the state and serves as the final
                authority over all ministries, districts, and institutions.
              </p>
            </div>
          </article>

          <article className="government-office government-office--executive">
            <p className="government-office__rank">Executive Command</p>
            <h2>Executive Director Eclip</h2>
            <strong>Executive Director of Union Administration</strong>
            <p>
              Responsible for carrying out the Chairman&apos;s directives,
              coordinating government operations, and ensuring every ministry
              acts in accordance with Union doctrine.
            </p>
          </article>

          <div className="government-ministries">
            {ministries.map((ministry) => (
              <article className="government-ministry" key={ministry.name}>
                <p className="government-office__rank">Ministry</p>
                <h3>{ministry.name}</h3>
                <dl>
                  <div>
                    <dt>Head</dt>
                    <dd>{ministry.head}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{ministry.purpose}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section
          className="government-principles"
          aria-labelledby="government-principles-title"
        >
          <div className="government-section-heading">
            <p className="government-hero__eyebrow">Civic Doctrine</p>
            <h2 id="government-principles-title">Principles of Government</h2>
          </div>

          <div className="government-principles__grid">
            {principles.map((principle) => (
              <article className="government-principle" key={principle.name}>
                <span aria-hidden="true">{principle.icon}</span>
                <strong>{principle.name}</strong>
                <p>{principle.vow}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="government-return">
          <Link className="state-hero__button" href="/">
            <span>Return to the Union</span>
            <span aria-hidden="true">+</span>
          </Link>
        </div>
      </main>
    </SiteLayout>
  );
}
