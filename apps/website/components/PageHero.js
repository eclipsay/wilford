export function PageHero({ eyebrow, title, description }) {
  return (
    <section className="hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">{description}</p>
    </section>
  );
}
