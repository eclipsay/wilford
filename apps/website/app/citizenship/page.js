import Link from "next/link";
import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

export const metadata = {
  title: "Citizenship | Wilford Panem Union",
  description: "Apply for citizenship of the Wilford Panem Union."
};

const requirements = [
  "Good standing",
  "Loyalty",
  "Skills or service value",
  "Respect for Union law"
];

const benefits = [
  "Panem Credit access",
  "Employment opportunities",
  "Housing preference",
  "State protection",
  "Civic advancement"
];

const processSteps = [
  "Submit Petition",
  "Review",
  "Interview",
  "Oath of Unity",
  "Citizenship Granted"
];

export default function CitizenshipPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Government Intake Portal"
        title="Apply for Citizenship of the Wilford Panem Union"
        description="Order recognizes those prepared to belong."
      />

      <main className="content content--wide citizenship-page">
        <section className="citizenship-intake scroll-fade">
          <div className="citizenship-intake__seal">
            <Image
              className="grand-seal-small grand-seal-small--access"
              src="/wpu-grand-seal.png"
              alt="Grand Seal of the Wilford Panem Union"
              width={128}
              height={128}
              priority
            />
          </div>
          <div>
            <p className="eyebrow">Introduction</p>
            <h2>Citizenship Is A Covenant With The State</h2>
            <p>
              Joining the Union means entering a future of order, prosperity, and purpose.
            </p>
          </div>
          <aside className="citizenship-intake__status" aria-label="Citizenship intake status">
            <span>Intake Status</span>
            <strong>Open</strong>
            <p>Petitions are received under Union review authority.</p>
          </aside>
        </section>

        <section className="state-section citizenship-section scroll-fade">
          <div className="premium-intro">
            <p className="eyebrow">Eligibility</p>
            <h2>Requirements</h2>
          </div>
          <ul className="citizenship-ledger citizenship-ledger--requirements">
            {requirements.map((requirement) => (
              <li key={requirement}>
                <span>{requirement}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="state-section citizenship-section scroll-fade">
          <div className="premium-intro">
            <p className="eyebrow">Privileges</p>
            <h2>Benefits of Citizenship</h2>
          </div>
          <ul className="citizenship-ledger citizenship-ledger--benefits">
            {benefits.map((benefit) => (
              <li key={benefit}>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="state-section citizenship-section scroll-fade">
          <div className="premium-intro">
            <p className="eyebrow">Procedure</p>
            <h2>Application Process</h2>
          </div>
          <div className="process-timeline">
            {processSteps.map((step, index) => (
              <div className="process-step citizenship-process-step" key={step}>
                <div className="process-step__number">{index + 1}</div>
                <div className="process-step__content">
                  <span>Step {index + 1}</span>
                  <h3>{step}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="state-section citizenship-section scroll-fade">
          <div className="cta-container">
            <div className="official-access-seal">
              <Image
                className="grand-seal-small grand-seal-small--access"
                src="/wpu-grand-seal.png"
                alt="Grand Seal of the Wilford Panem Union"
                width={128}
                height={128}
              />
            </div>
            <h2>Enter The Civic Record</h2>
            <p className="premium-lead">
              The Union admits those prepared to stand in loyalty, usefulness, and law.
            </p>
            <Link className="button button--solid-site button--large" href="/citizenship/petition">
              BEGIN APPLICATION
            </Link>
          </div>
        </section>

        <p className="service-line">One Union. One Future.</p>
      </main>
    </SiteLayout>
  );
}
