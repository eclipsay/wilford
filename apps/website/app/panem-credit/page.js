import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const benefits = ["Secure Wages", "District Trade", "Civic Rewards", "Verified Identity"];

export const metadata = {
  title: "Panem Credit"
};

export default function PanemCreditPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="State Treasury"
        title="Panem Credit"
        description="One Currency. One Economy. One Union."
      />

      <main className="content content--wide finance-page">
        <section className="finance-portal scroll-fade">
          <article className="wallet-card">
            <p>Citizen Wallet</p>
            <h2>Verified Union Account</h2>
            <div className="wallet-card__balance">PC 12,480</div>
            <span>Active citizenship privileges confirmed</span>
          </article>

          <article className="finance-panel">
            <p className="eyebrow">District Output Dashboard</p>
            <h2>National Flow</h2>
            <div className="finance-bars">
              {["Production", "Transport", "Agriculture", "Security"].map((item, index) => (
                <div className="finance-bar" key={item}>
                  <span>{item}</span>
                  <i style={{ "--value": `${72 + index * 6}%` }} />
                </div>
              ))}
            </div>
          </article>

          <article className="finance-panel finance-panel--metrics">
            <p className="eyebrow">National Prosperity Metrics</p>
            <div className="metric-grid">
              <span><strong>98%</strong> Wage Reliability</span>
              <span><strong>14</strong> District Ledgers</span>
              <span><strong>24/7</strong> Identity Verification</span>
              <span><strong>1</strong> Union Economy</span>
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade" aria-labelledby="benefits-title">
          <p className="eyebrow">Citizen Benefits</p>
          <h2 id="benefits-title">Access Through Service</h2>
          <div className="premium-grid premium-grid--four">
            {benefits.map((benefit) => (
              <article className="premium-card" key={benefit}>
                <h3>{benefit}</h3>
                <p>Integrated into the secure Panem Credit civic ledger.</p>
              </article>
            ))}
          </div>
          <p className="state-warning">Credit access is a privilege of citizenship.</p>
        </section>
      </main>
    </SiteLayout>
  );
}
