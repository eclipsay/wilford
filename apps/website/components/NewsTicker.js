import { getActiveBulletins, hasEmergencyBulletin } from "../lib/bulletins";

function TickerItem({ bulletin, fallback = false }) {
  if (fallback) {
    return (
      <span className="news-item news-item--standard">
        Official bulletins will appear here.
      </span>
    );
  }

  return (
    <span className={`news-item news-item--${bulletin.priority}`}>
      {bulletin.priority === "emergency" ? (
        <span className="news-badge news-badge--emergency">Emergency Directive</span>
      ) : null}
      {bulletin.priority === "priority" ? (
        <span className="news-badge news-badge--priority">Priority</span>
      ) : null}
      <span className="news-item__headline">{bulletin.headline}</span>
    </span>
  );
}

function TickerSequence({ bulletins }) {
  const items = bulletins.length ? bulletins : [null];

  return (
    <span className="news-ticker__sequence">
      {items.map((bulletin, index) => (
        <span className="news-ticker__unit" key={bulletin?.id || "fallback"}>
          <TickerItem bulletin={bulletin} fallback={!bulletin} />
          <span className="news-separator" aria-hidden="true">
            ◆
          </span>
        </span>
      ))}
    </span>
  );
}

export async function NewsTicker() {
  const bulletins = await getActiveBulletins();
  const emergency = hasEmergencyBulletin(bulletins);

  return (
    <aside
      className={`news-ticker${emergency ? " news-ticker--emergency" : ""}`}
      aria-label="WPU news bulletin"
    >
      <div className="news-ticker__label">WPU BULLETIN</div>
      <div className="news-ticker__viewport">
        <div className="news-ticker__track">
          <TickerSequence bulletins={bulletins} />
          <TickerSequence bulletins={bulletins} />
        </div>
      </div>
    </aside>
  );
}
