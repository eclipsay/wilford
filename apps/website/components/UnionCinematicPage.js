"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

const historySections = [
  {
    marker: "Section 1",
    title: "The Final Days of Snowpiercer",
    text: [
      "After the death of Mr Wilford, Snowpiercer drifted leaderless through the frozen world. Factions rose, discipline weakened, and uncertainty spread through the final refuge of mankind.",
      "In this hour of crisis, Chairman Lemmie seized command.",
      "Where others argued, she acted. Where others feared, she ruled."
    ],
    visual: "frost"
  },
  {
    marker: "Section 2",
    title: "A Signal Beyond the Ice",
    text: [
      "Recovered transmissions spoke of a distant land untouched by the freeze - Panem.",
      "A fractured civilization of districts, Capitol excess, and civil war.",
      "Seeing destiny where others saw myth, Chairman Lemmie ordered the impossible.",
      "The Great Engine turned south."
    ],
    visual: "signal"
  },
  {
    marker: "Section 3",
    title: "The Day Two Worlds Met",
    text: [
      "When Snowpiercer arrived, Panem stood in chaos.",
      "President Snow had fallen beneath the crowd. Coin sought control. The Capitol burned.",
      "Chairman Lemmie entered the city not as conqueror, but as order itself."
    ],
    visual: "capitol"
  },
  {
    marker: "Section 4",
    title: "Bread Before Politics",
    text: [
      "While factions fought for power, Lemmie opened Snowpiercer's reserves.",
      "Food was distributed. Water systems restored. Medical aid deployed. Crowds calmed.",
      "Where speeches failed, action succeeded."
    ],
    visual: "relief"
  },
  {
    marker: "Section 5",
    title: "One People. One Future.",
    text: [
      "Before the shattered Capitol, Chairman Lemmie united Snowpiercer and Panem.",
      "The train brought endurance. Panem brought land. The Union brought destiny.",
      "Thus was born the Wilford Panem Union."
    ],
    quote: "From motion came strength. From division came unity.",
    visual: "banners"
  }
];

const districts = [
  ["District 1", "Luxury Goods & State Design"],
  ["District 2", "Security & Military Industry"],
  ["District 3", "Technology & Surveillance"],
  ["District 4", "Maritime Trade & Fisheries"],
  ["District 5", "Energy Grid & Power"],
  ["District 6", "Railways & Logistics"],
  ["District 7", "Construction & Timber"],
  ["District 8", "Textiles & Uniforms"],
  ["District 9", "Grain Production"],
  ["District 10", "Livestock Supply"],
  ["District 11", "Mega Agriculture"],
  ["District 12", "Steel, Coal & Heritage Industry"]
];

const engineFeatures = [
  "Chairman's State Carriage",
  "Grand Council Dining Hall",
  "Treasury Vault Car",
  "Security Command Car",
  "Chapel Car",
  "Observation Dome"
];

const creditCounters = [
  "Wage Deposits",
  "District Output",
  "Trade Access",
  "Civic Rewards"
];

function EternalEngine({ compact = false }) {
  const carriageCount = compact ? 4 : 7;

  return (
    <div className={`eternal-engine${compact ? " eternal-engine--compact" : ""}`} aria-hidden="true">
      <span className="eternal-engine__smoke eternal-engine__smoke--one" />
      <span className="eternal-engine__smoke eternal-engine__smoke--two" />
      <span className="eternal-engine__smoke eternal-engine__smoke--three" />
      <span className="eternal-engine__headlamp" />
      <div className="eternal-engine__locomotive">
        <span className="eternal-engine__plow" />
        <span className="eternal-engine__cockpit" />
        <span className="eternal-engine__crest">WPU</span>
        <span className="eternal-engine__chimney" />
        <span className="eternal-engine__wheel eternal-engine__wheel--front" />
        <span className="eternal-engine__wheel eternal-engine__wheel--rear" />
      </div>
      <div className="eternal-engine__carriages">
        {Array.from({ length: carriageCount }, (_, index) => (
          <span className="eternal-engine__carriage" key={index}>
            <i />
            <i />
            <i />
            <b />
          </span>
        ))}
      </div>
    </div>
  );
}

function PanemReveal() {
  return (
    <div className="union-panem-reveal" aria-hidden="true">
      <div className="union-panem-reveal__burst" />
      <p className="union-panem-reveal__arrival">Arrival at the Capitol</p>
      <p className="union-panem-reveal__route-label">Route of the Eternal Engine</p>
      <svg className="union-panem-map" viewBox="0 0 740 360" role="img">
        <defs>
          <radialGradient id="capitolGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3cc8a" stopOpacity="0.9" />
            <stop offset="58%" stopColor="#d7a85f" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d7a85f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          className="union-panem-map__continent"
          d="M126 54 C194 24 274 34 326 58 C374 30 455 38 506 78 C574 74 638 110 662 170 C690 242 632 306 548 320 C488 336 426 318 376 294 C322 330 246 326 198 288 C138 272 92 214 94 154 C96 106 102 72 126 54 Z"
        />
        <path
          className="union-panem-map__mountains"
          d="M258 72 L286 132 L230 132 Z M304 62 L340 146 L268 146 Z M354 84 L382 140 L326 140 Z"
        />
        <g className="union-panem-map__borders">
          <path d="M300 72 C286 126 286 190 320 290" />
          <path d="M382 80 C404 138 404 212 376 294" />
          <path d="M142 162 C244 146 332 148 456 110" />
          <path d="M150 246 C270 226 394 236 604 274" />
          <path d="M462 100 C494 160 526 236 548 320" />
          <path d="M212 82 C232 150 218 218 198 288" />
        </g>
        <g className="union-panem-map__rails">
          <path d="M318 128 L160 118" />
          <path d="M318 128 L142 214" />
          <path d="M318 128 L220 278" />
          <path d="M318 128 L410 270" />
          <path d="M318 128 L548 276" />
          <path d="M318 128 L570 138" />
          <path d="M318 128 L610 66" />
        </g>
        <path className="union-panem-map__route" d="M298 10 C300 48 306 84 318 128" />
        <circle className="union-panem-map__glow" cx="318" cy="128" r="104" fill="url(#capitolGlow)" />
        <g className="union-panem-map__capitol">
          <path d="M276 170 H360 L348 188 H288 Z" />
          <path d="M294 168 V132 H306 V168" />
          <path d="M312 168 V104 H330 V168" />
          <path d="M338 168 V138 H350 V168" />
          <path d="M321 88 L338 106 H304 Z" />
        </g>
        {[
          [346, 112, "1"],
          [380, 148, "2"],
          [438, 158, "3"],
          [142, 214, "4"],
          [414, 220, "5"],
          [278, 218, "6"],
          [520, 116, "7"],
          [470, 252, "8"],
          [548, 276, "9"],
          [220, 278, "10"],
          [594, 244, "11"],
          [570, 138, "12"],
          [610, 66, "13"]
        ].map(([cx, cy, label]) => (
          <g className="union-panem-map__district" key={label}>
            <circle cx={cx} cy={cy} r="14" />
            <text x={cx} y={cy + 4}>{label}</text>
          </g>
        ))}
      </svg>
      <div className="union-government-reveal">
        <svg className="union-government-building" viewBox="0 0 760 390" role="img">
          <path className="union-government-building__ground" d="M104 336 H656" />
          <path className="union-government-building__stairs" d="M176 336 H584 M208 316 H552 M238 296 H522" />
          <path className="union-government-building__roof" d="M164 172 H596 L548 214 H212 Z" />
          <path className="union-government-building__dome" d="M310 168 C314 106 446 106 450 168" />
          <path className="union-government-building__crest" d="M380 76 L408 104 L380 132 L352 104 Z" />
          <circle className="union-government-building__seal" cx="380" cy="104" r="18" />
          <text x="380" y="110">WPU</text>
          <g className="union-government-building__columns">
            {[242, 288, 334, 380, 426, 472, 518].map((x) => (
              <path key={x} d={`M${x} 214 V296 M${x - 14} 214 H${x + 14} M${x - 18} 296 H${x + 18}`} />
            ))}
          </g>
          <path className="union-government-building__wings" d="M116 214 H212 V312 H116 Z M548 214 H644 V312 H548 Z" />
          <path className="union-government-building__banner" d="M348 214 H412 V296 H348 Z" />
        </svg>
        <h3>The Grand Government Building</h3>
        <p>Seat of Chairman Lemmie and the Wilford Panem Union.</p>
      </div>
    </div>
  );
}

export function UnionCinematicPage() {
  const timelineRef = useRef(null);

  useEffect(() => {
    const timeline = timelineRef.current;
    const page = timeline?.closest(".union-cinema");
    const reveals = Array.from(document.querySelectorAll(".union-reveal"));

    if (page) {
      page.classList.add("union-cinema--animated");
    }

    const updateProgress = () => {
      if (!timeline) {
        return;
      }

      const rect = timeline.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel <= 0 ? 0 : (window.innerHeight * 0.18 - rect.top) / travel;
      const progress = Math.min(1, Math.max(0, raw));
      if (page) {
        page.style.setProperty("--union-progress", `${progress * 100}`);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    reveals.forEach((node) => observer.observe(node));
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (page) {
        page.classList.remove("union-cinema--animated");
      }
    };
  }, []);

  return (
    <main className="union-cinema">
      <section className="union-cinema-hero" aria-labelledby="union-title">
        <div className="union-cinema-hero__backdrop" aria-hidden="true">
          <span className="union-skyline" />
          <span className="union-mountains union-mountains--rear" />
          <span className="union-mountains union-mountains--front" />
          <span className="union-rails" />
          <span className="union-beam union-beam--left" />
          <span className="union-beam union-beam--right" />
          <span className="union-smoke union-smoke--one" />
          <span className="union-smoke union-smoke--two" />
        </div>

        <div className="union-cinema-hero__copy union-reveal">
          <p className="union-cinema-eyebrow">Official State History Archive</p>
          <h1 id="union-title">The Union</h1>
          <p className="union-cinema-hero__subtitle">
            From Ice and Fire, A New Civilization Was Forged.
          </p>
          <a className="union-gold-button" href="#official-history">
            <span>View Official History</span>
            <span aria-hidden="true">+</span>
          </a>
        </div>
      </section>

      <section
        id="official-history"
        className="union-scroll-history"
        ref={timelineRef}
        aria-label="Official history timeline"
      >
        <div className="union-scroll-history__stage">
          <div className="union-map" aria-hidden="true">
            <span className="union-map__grid" />
            <span className="union-map__capitol" />
            <span className="union-map__sun" />
          </div>
          <PanemReveal />

          <div className="union-track" aria-hidden="true">
            <span className="union-track__line" />
            <span className="union-track__ticks" />
            <div className="union-track__train">
              <EternalEngine />
            </div>
          </div>

          <ol className="union-scroll-history__markers" aria-hidden="true">
            {historySections.map((section) => (
              <li key={section.title}>{section.marker.replace("Section ", "")}</li>
            ))}
          </ol>
        </div>

        <div className="union-history-cards">
          {historySections.map((section) => (
            <article
              className={`union-history-card union-history-card--${section.visual} union-reveal`}
              key={section.title}
            >
              <div className="union-mobile-train" aria-hidden="true">
                <EternalEngine compact />
              </div>
              <div className="union-history-card__visual" aria-hidden="true">
                <span />
              </div>
              <div className="union-history-card__copy">
                <p className="union-cinema-eyebrow">{section.marker}</p>
                <h2>{section.title}</h2>
                {section.text.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.quote ? <blockquote>{section.quote}</blockquote> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="union-archive-section union-reveal">
        <div className="union-section-heading">
          <p className="union-cinema-eyebrow">Section 6</p>
          <h2>The Districts Reborn</h2>
          <p>
            The districts were transformed from instruments of punishment into
            engines of production. Each district rebuilt with purpose, wages,
            rail access, and state investment.
          </p>
        </div>

        <div className="union-district-grid">
          {districts.map(([name, purpose], index) => (
            <article
              className="union-district-card union-reveal"
              key={name}
              style={{ "--delay": `${index * 35}ms` }}
            >
              <span>{name}</span>
              <strong>{purpose}</strong>
            </article>
          ))}
        </div>

        <p className="union-archive-note">All serve the Capitol. All strengthen the Union.</p>
      </section>

      <section className="union-engine-section union-reveal">
        <div className="union-engine-section__copy">
          <p className="union-cinema-eyebrow">Section 7</p>
          <h2>The Eternal Engine</h2>
          <p>
            Once mankind's last refuge, Snowpiercer became the grand artery of
            the Union. It carries leadership, commerce, relief, and authority
            between all districts.
          </p>
        </div>

        <div className="union-engine-render">
          <EternalEngine compact />
        </div>

        <div className="union-feature-grid">
          {engineFeatures.map((feature) => (
            <article className="union-feature-card union-reveal" key={feature}>
              <span aria-hidden="true">WPU</span>
              <strong>{feature}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="union-credit-section union-reveal">
        <div>
          <p className="union-cinema-eyebrow">Section 8</p>
          <h2>A Nation Connected</h2>
          <p>
            The Union introduced Panem Credit, a secure digital currency linking
            every district to one economy.
          </p>
        </div>

        <div className="union-credit-grid">
          {creditCounters.map((counter, index) => (
            <article className="union-credit-card" key={counter}>
              <span>{counter}</span>
              <strong>{String(94 + index).padStart(2, "0")}%</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="union-modern-section union-reveal">
        <div className="union-modern-section__sun" aria-hidden="true" />
        <div className="union-modern-section__flags" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="union-cinema-eyebrow">Section 9</p>
        <h2>Prosperity Through Unity</h2>
        <p>
          Today the Union stands as the greatest civilization of the modern age.
        </p>
        <p>
          Its cities shine. Its people are fed. Its rails are unbroken. Its
          enemies are silent.
        </p>
      </section>

      <section className="union-final-cinema union-reveal">
        <blockquote>"History divided the world. Lemmie united it."</blockquote>
        <div className="union-final-cinema__seal union-reveal" style={{ "--delay": "180ms" }}>
          <Image
            className="grand-seal"
            src="/wpu-grand-seal.png"
            alt="Grand Seal of the Wilford Panem Union"
            width={640}
            height={640}
          />
          <p>Sealed under the authority of the Wilford Panem Union.</p>
        </div>
        <div className="union-final-cinema__actions">
          <Link className="union-gold-button" href="/">
            <span>Return Home</span>
            <span aria-hidden="true">+</span>
          </Link>
          <Link className="union-gold-button union-gold-button--ghost" href="/government">
            <span>View Government</span>
            <span aria-hidden="true">+</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
