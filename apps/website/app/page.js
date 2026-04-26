import Image from "next/image";
import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent } from "../lib/content";

export default async function HomePage() {
  const content = await getSiteContent();
  const chairman = content.settings.chairmanName || "Lemmie";

  return (
    <SiteLayout>
      <main className="state-home">
        <section className="state-hero" aria-labelledby="state-home-title">
          <div className="state-hero__shade" />

          <div className="state-hero__copy">
            <p className="state-hero__kicker">Welcome to</p>
            <h1 id="state-home-title">
              <span>Wilford</span>
              <span>Industries</span>
            </h1>
            <p className="state-hero__subhead">
              Under the leadership of our Chairman,
              <span>{chairman}</span>
            </p>
            <p className="state-hero__decree">
              We serve not only progress, but a higher purpose.
              Through faith, discipline, and devotion, we build a better world
              in His image. Glory to God. Glory to Wilford.
            </p>
            <a className="state-hero__button" href="/information">
              <span>Enter the State</span>
              <span aria-hidden="true">+</span>
            </a>
          </div>

          <div className="state-creed" aria-label="Wilford creed">
            <article>
              <Image
                className="state-creed__icon"
                src="/creed-icons/faith.png"
                alt=""
                aria-hidden="true"
                width={58}
                height={58}
              />
              <strong>Faith</strong>
              <span>Is Our Guide</span>
            </article>
            <article>
              <Image
                className="state-creed__icon"
                src="/creed-icons/service.png"
                alt=""
                aria-hidden="true"
                width={58}
                height={58}
              />
              <strong>Service</strong>
              <span>Is Our Duty</span>
            </article>
            <article>
              <Image
                className="state-creed__icon"
                src="/creed-icons/unity.png"
                alt=""
                aria-hidden="true"
                width={58}
                height={58}
              />
              <strong>Unity</strong>
              <span>Is Our Strength</span>
            </article>
            <article>
              <Image
                className="state-creed__icon"
                src="/creed-icons/future.png"
                alt=""
                aria-hidden="true"
                width={58}
                height={58}
              />
              <strong>The Future</strong>
              <span>Is Our Mission</span>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
