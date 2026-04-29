import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { districtSlug, getCitizenState } from "../../../lib/citizen-state";
import { getPublishedArticles } from "../../../lib/articles";
import { getActiveBulletins } from "../../../lib/bulletins";
import { getEconomyStore } from "../../../lib/panem-credit";
import { governorProfileFromDistrict } from "../../../lib/people";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const state = await getCitizenState();
  const district = state.districtProfiles.find((item) => districtSlug(item) === slug);

  return {
    title: district ? district.name : "District"
  };
}

export default async function DistrictPage({ params }) {
  const { slug } = await params;
  const [state, economy, articles, bulletins] = await Promise.all([
    getCitizenState(),
    getEconomyStore(),
    getPublishedArticles(),
    getActiveBulletins()
  ]);
  const district = state.districtProfiles.find((item) => districtSlug(item) === slug);

  if (!district) notFound();

  const governor = governorProfileFromDistrict(district);
  const economyDistrict = economy.districts.find((item) => item.id === district.id || item.name === district.canonicalName);
  const goods = economy.marketItems.filter((item) => item.district === district.canonicalName).slice(0, 6);
  const relatedArticles = articles
    .filter((article) => {
      const haystack = `${article.title} ${article.subtitle} ${article.body} ${article.category}`.toLowerCase();
      return haystack.includes(district.name.toLowerCase()) || haystack.includes("district");
    })
    .slice(0, 3);
  const relatedBulletins = [
    ...district.recentBulletins.map((headline) => ({ id: headline, headline, category: "Districts" })),
    ...bulletins.filter((bulletin) => {
      const haystack = `${bulletin.headline} ${bulletin.category}`.toLowerCase();
      return haystack.includes(district.name.toLowerCase()) || haystack.includes("district");
    })
  ].slice(0, 4);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="District Record"
        title={district.name}
        description={district.loreDescription}
      />

      <main className="content content--wide district-detail-page">
        <section className="district-detail-hero scroll-fade">
          <Link className="district-detail-portrait" href={governor.href}>
            <Image
              src={district.governorPortrait || "/wpu-grand-seal.png"}
              alt={`Official portrait of ${district.governorName}`}
              width={520}
              height={640}
              priority
            />
          </Link>
          <div className="district-detail-summary">
            <p className="eyebrow">{district.governorTitle}</p>
            <h2>{district.governorName}</h2>
            <p>{district.governorBiography}</p>
            {district.loreNote ? <strong>{district.loreNote}</strong> : null}
            <Link className="button" href={governor.href}>Governor Biography</Link>
          </div>
        </section>

        <section className="district-detail-grid scroll-fade" aria-label={`${district.name} district information`}>
          <article className="premium-card">
            <p className="eyebrow">Industry</p>
            <h3>{district.industry}</h3>
            <p>{district.economicOutput}</p>
          </article>
          <article className="premium-card">
            <p className="eyebrow">Production</p>
            <h3>{goods.map((item) => item.name).join(", ") || district.productionGoods}</h3>
            <p>{district.tradeRelevance}</p>
          </article>
          <article className="premium-card">
            <p className="eyebrow">Economy</p>
            <h3>{formatCredits(economyDistrict?.tradeVolume || 0)}</h3>
            <p>Loyalty rating: {economyDistrict?.loyaltyScore ?? district.loyaltyRating}</p>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Lore</p>
          <h2>{district.name} Identity</h2>
          <p>{district.loreDescription}</p>
          <dl className="panem-ledger">
            <div><dt>Landmarks</dt><dd>{district.keyLandmarks.join(", ")}</dd></div>
            <div><dt>Development status</dt><dd>{district.developmentStatus}</dd></div>
            <div><dt>Governor</dt><dd>{district.governorName}</dd></div>
          </dl>
        </section>

        {(relatedArticles.length || relatedBulletins.length) ? (
          <section className="state-section scroll-fade">
            <p className="eyebrow">Dispatches</p>
            <h2>Recent Articles & Bulletins</h2>
            <div className="district-dispatch-grid">
              {relatedArticles.map((article) => (
                <Link className="premium-card" href={`/news/${article.id}`} key={article.id}>
                  <span>{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.subtitle || `${article.body.slice(0, 140)}...`}</p>
                </Link>
              ))}
              {relatedBulletins.map((bulletin) => (
                <article className="premium-card" key={bulletin.id}>
                  <span>{bulletin.category}</span>
                  <h3>{bulletin.headline}</h3>
                  <p>Official district bulletin.</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
