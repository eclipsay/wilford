import Image from "next/image";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

const doctrine = [
  ["Faith", "Belief gives the Union its moral center and binds public service to sacred duty."],
  ["Discipline", "Order is maintained through precision, obedience, and unwavering standards."],
  ["Vision", "The Chairman sees beyond crisis toward the world that must be built next."],
  ["Unity", "No district stands alone. No citizen rises outside the shared destiny of the Union."]
];

const timeline = [
  ["Rise After Wilford", "Lemmie assumed command after the fall of Wilford and stabilized the fractured chain of authority."],
  ["Command Of Snowpiercer", "She transformed the Eternal Engine from refuge into government, treasury, and moving command."],
  ["Arrival In Panem", "At the moment of Panem's collapse, Lemmie brought food, medicine, rail order, and state discipline."],
  ["Formation Of The Union", "Snowpiercer and Panem were joined under one seal, one economy, and one future."]
];

const quotes = [
  "A leader does not inherit the future. A leader constructs it.",
  "Where division speaks loudly, unity must answer with action.",
  "The Union endures because service is stronger than fear."
];

export default function ChairmanPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Head Of State"
        title="The Chairman"
        description="Founder. Leader. Builder of Worlds."
      />

      <main className="content content--wide chairman-page">
        <section className="chairman-portrait-hero scroll-fade">
          <figure className="chairman-portrait-hero__figure">
            <Image
              src="/chairman-lemmie-portrait.png"
              alt="Official Portrait of Chairman Lemmie"
              width={1122}
              height={1402}
              className="portrait-frame"
              priority
            />
            <figcaption>
              Chairman Lemmie
              <span>Supreme Chairman of the Wilford Panem Union</span>
            </figcaption>
          </figure>

          <div className="chairman-portrait-hero__copy">
            <p className="eyebrow">Official Biography</p>
            <h2>Chairman Lemmie</h2>
            <div className="prose">
              <p>
                Chairman Lemmie rose in the age after Wilford, when the last
                machine of civilization required more than engineering. It
                required belief, discipline, and the will to command.
              </p>
              <p>
                On Snowpiercer, she consolidated scattered loyalties into a
                single executive order. The train became more than survival: it
                became a state in motion, carrying law, industry, security, and
                civic doctrine through a ruined world.
              </p>
              <p>
                In Panem, she entered a civilization broken by spectacle,
                hunger, rebellion, and exhausted institutions. Her first decree
                was not conquest, but restoration. Bread was distributed before
                politics. Rails moved before speeches. Order returned before
                factions could claim the ashes.
              </p>
              <p>
                Today, Chairman Lemmie stands as Founder and Supreme Chairman
                of the Wilford Panem Union, the final authority over government,
                districts, ministries, and the future they serve.
              </p>
            </div>
          </div>
        </section>

        <section className="state-section scroll-fade" aria-labelledby="doctrine-title">
          <p className="eyebrow">Civic Doctrine</p>
          <h2 id="doctrine-title">Doctrine Of Leadership</h2>
          <div className="premium-grid premium-grid--four">
            {doctrine.map(([title, text]) => (
              <article className="premium-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade" aria-labelledby="rule-title">
          <p className="eyebrow">Official Record</p>
          <h2 id="rule-title">Timeline Of Rule</h2>
          <ol className="state-timeline">
            {timeline.map(([title, text]) => (
              <li key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="state-section scroll-fade" aria-labelledby="words-title">
          <p className="eyebrow">State Archive</p>
          <h2 id="words-title">Official Words</h2>
          <div className="premium-grid premium-grid--three">
            {quotes.map((quote) => (
              <blockquote className="quote-card" key={quote}>
                {quote}
              </blockquote>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
