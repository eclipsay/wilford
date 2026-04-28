import Image from "next/image";
import { AnthemVideo } from "../components/AnthemVideo";
import { SiteLayout } from "../components/SiteLayout";

const creed = [
  ["faith.png", "Faith", "Is Our Guide"],
  ["service.png", "Service", "Is Our Duty"],
  ["unity.png", "Unity", "Is Our Strength"],
  ["future.png", "The Future", "Is Our Mission"]
];

const mandates = [
  {
    title: "Order From Division",
    text: "The Union restores civic confidence through discipline, service, and clear authority."
  },
  {
    title: "Prosperity By Duty",
    text: "Every district, ministry, and citizen contributes to one durable national future."
  },
  {
    title: "Faith In The Union",
    text: "Shared belief binds the people to a higher purpose beyond private ambition."
  }
];

const anthemLines = [
  "From iron rail to Capitol flame, the Union speaks one sacred name.",
  "Through storm and ash, through night and snow, our golden banners rise and glow.",
  "One law, one heart, one future drawn; the Wilford Panem Union dawns.",
  "In faith and service we remain, the engine, district, crown, and train."
];

export default function HomePage() {
  return (
    <SiteLayout>
      <main className="state-home">
        <section className="state-hero" aria-labelledby="state-home-title">
          <div className="state-hero__shade" />

          <div className="state-hero__copy">
            <p className="state-hero__kicker">Welcome To The</p>
            <h1 id="state-home-title">
              <span>Wilford Panem</span>
              <span>Union</span>
            </h1>
            <p className="state-hero__subhead">
              Under the leadership of
              <span>Chairman Lemmie</span>
            </p>
            <p className="state-hero__decree">
              Through faith, discipline, unity, and prosperity, the Union builds
              a stronger future from the ashes of division.
            </p>
            <a className="state-hero__button" href="/information">
              <span>Enter The Union</span>
              <span aria-hidden="true">+</span>
            </a>
          </div>

          <div className="state-creed" aria-label="Union creed">
            {creed.map(([icon, word, vow]) => (
              <article key={word}>
                <Image
                  className="state-creed__icon"
                  src={`/creed-icons/${icon}`}
                  alt=""
                  aria-hidden="true"
                  width={58}
                  height={58}
                />
                <strong>{word}</strong>
                <span>{vow}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="state-mandates scroll-fade" aria-labelledby="mandates-title">
          <div className="state-mandates__heading">
            <p className="eyebrow">Official State Portal</p>
            <h2 id="mandates-title">One Union. One Future.</h2>
          </div>
          <div className="state-mandates__grid">
            {mandates.map((mandate) => (
              <article className="premium-card" key={mandate.title}>
                <h3>{mandate.title}</h3>
                <p>{mandate.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="anthem-showcase scroll-fade" aria-labelledby="anthem-title">
          <div className="anthem-showcase__media" aria-label="Anthem media showcase">
            <div className="anthem-showcase__screen">
              <p className="anthem-showcase__broadcast-label">
                Official Ceremonial Broadcast
              </p>
              <AnthemVideo />
            </div>
          </div>
          <div className="anthem-showcase__copy">
            <p className="eyebrow">State Ceremony</p>
            <h2 id="anthem-title">National Anthem of the Wilford Panem Union</h2>
            <p>
              A formal anthem presentation for ceremonies, broadcasts, public
              observances, and Union civic events.
            </p>
            <div className="anthem-showcase__lyrics">
              {anthemLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
