import Image from "next/image";
import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent } from "../lib/content";

export default async function HomePage() {
  const content = await getSiteContent();
  const chairman = content.settings.chairmanName || "Lemmie";
  const biographies = [
    {
      name: "Chairman Lemmie",
      title: "Transformation Era",
      image: "/lemmie-portrait.png",
      summary:
        "Chairman Lemmie assumed control of Wilford Industries following the departure of its founder, Mr Wilford, and reshaped it into the modern company-state seen today.",
      details: [
        "Under her stewardship, Wilford Industries evolved from a modest industrial concern into a powerful corporate empire.",
        "Her rule is defined by iron discipline, strategic modernization, and the consolidation of authority across the entire Wilford command structure.",
        "Official records present her legacy as the rise of order, expansion, and dominance from the ashes of a simpler time."
      ]
    },
    ...Array.from({ length: 13 }, (_, index) => ({
      name: `Archive Entry ${String(index + 2).padStart(2, "0")}`,
      title: "Reserved Biography Slot",
      image: null,
      summary:
        "This record space is reserved for future leadership, member, or historical profile entries within the Wilford archive.",
      details: [
        "Add portrait, rank, and official narrative here.",
        "Structured to keep the homepage grid balanced as the archive grows."
      ]
    }))
  ];

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

        <section className="state-biographies" aria-labelledby="state-biographies-title">
          <div className="state-biographies__header">
            <p className="state-biographies__eyebrow">Official Archive</p>
            <h2 id="state-biographies-title">Biographies</h2>
            <p className="state-biographies__lede">
              A growing record of the figures who define Wilford Industries,
              beginning with the current Chairman and leaving structured room
              for the archive to expand.
            </p>
          </div>

          <div className="state-biographies__grid">
            {biographies.map((entry) => (
              <article
                key={entry.name}
                className={`biography-card${entry.image ? " biography-card--featured" : " biography-card--placeholder"}`}
              >
                {entry.image ? (
                  <div className="biography-card__image-wrap">
                    <Image
                      src={entry.image}
                      alt={`Official portrait of ${entry.name}`}
                      width={480}
                      height={600}
                      className="biography-card__image"
                    />
                  </div>
                ) : (
                  <div className="biography-card__image-wrap biography-card__image-wrap--empty">
                    <span>Portrait Pending</span>
                  </div>
                )}

                <div className="biography-card__body">
                  <p className="biography-card__eyebrow">{entry.title}</p>
                  <h3>{entry.name}</h3>
                  <p className="biography-card__summary">{entry.summary}</p>
                  <div className="biography-card__details">
                    {entry.details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
