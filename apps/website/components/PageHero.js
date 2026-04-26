export function PageHero({ eyebrow, title, description }) {
  return (
    <section className="hero hero--centered">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">{description}</p>
    </section>
  );
}
