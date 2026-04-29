import Image from "next/image";
import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCitizenState } from "../../lib/citizen-state";
import { getEconomyStore } from "../../lib/panem-credit";

export const metadata = {
  title: "Districts"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DistrictsPage() {
  const [state, economy] = await Promise.all([getCitizenState(), getEconomyStore()]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="District Administration"
        title="Districts of the Wilford Panem Union"
        description="Official district affiliations, industries, governors, production records, and Panem Credit trade relevance."
      />

      <main className="content content--wide districts-page">
        <section className="portal-intro scroll-fade">
          <div>
            <p className="eyebrow">One Union, Fourteen Jurisdictions</p>
            <h2>Every citizen belongs to the state system.</h2>
            <p>
              District affiliation links identity, wages, requests, production,
              trade, taxation, and civic development under the Ministry of Credit & Records.
            </p>
          </div>
          <div className="portal-status">
            <span>District Registry</span>
            <strong>{state.districtProfiles.length}</strong>
            <p>Capitol and Districts 1-13 active.</p>
          </div>
        </section>

        <section className="district-profile-grid scroll-fade" aria-label="District profiles">
          {state.districtProfiles.map((district) => {
            const economyDistrict = economy.districts.find((item) => item.id === district.id || item.name === district.canonicalName);
            const goods = economy.marketItems.filter((item) => item.district === district.canonicalName).slice(0, 3);
            const citizens = state.citizenRecords.filter((citizen) => citizen.district === district.canonicalName || citizen.district === district.name);
            const isCapitol = district.name === "Capitol" || district.canonicalName === "The Capitol";

            return (
              <article className={`district-profile-card${isCapitol ? " district-profile-card--capitol" : ""}`} key={district.id}>
                <div className="district-profile-card__governor">
                  <Image
                    src={district.governorPortrait || "/wpu-grand-seal.png"}
                    alt={`Official portrait of ${district.governorName}`}
                    width={180}
                    height={220}
                  />
                  <div>
                    {isCapitol ? <span className="capitol-prestige-badge">Capitol High Office</span> : null}
                    <p className="eyebrow">{district.governorTitle}</p>
                    <h3>{district.governorName}</h3>
                    <span>{district.appointmentDate}</span>
                  </div>
                </div>
                <div className="district-profile-card__body">
                  <span className="court-role-badge">{district.developmentStatus}</span>
                  <h2>{district.name}</h2>
                  <p>{district.loreDescription}</p>
                  <div className="metric-grid">
                    <span><strong>{district.industry}</strong> Industry</span>
                    <span><strong>{economyDistrict?.loyaltyScore ?? district.loyaltyRating}</strong> Loyalty</span>
                    <span><strong>{formatCredits(economyDistrict?.tradeVolume || 0)}</strong> Trade volume</span>
                    <span><strong>{citizens.length}</strong> Registered citizens</span>
                  </div>
                  <dl className="panem-ledger">
                    <div><dt>Economic output</dt><dd>{district.economicOutput}</dd></div>
                    <div><dt>Production goods</dt><dd>{goods.map((item) => item.name).join(", ") || district.productionGoods}</dd></div>
                    <div><dt>Credit relevance</dt><dd>{district.tradeRelevance}</dd></div>
                    <div><dt>Landmarks</dt><dd>{district.keyLandmarks.join(", ")}</dd></div>
                  </dl>
                  {district.recentBulletins.length ? (
                    <ul className="government-mini-list">
                      {district.recentBulletins.map((bulletin) => (
                        <li key={bulletin}><span>{bulletin}</span><strong>Bulletin</strong></li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </SiteLayout>
  );
}
