"use client";

import { useEffect, useRef, useState } from "react";

export function AnthemVideo() {
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!ready || !videoRef.current) {
      return;
    }

    videoRef.current.play().catch(() => {});
  }, [ready]);

  if (!ready) {
    return (
      <button
        className="anthem-showcase__poster"
        onClick={() => setReady(true)}
        type="button"
        aria-label="Load and play the official Wilford Panem Union anthem broadcast"
      >
        <span className="anthem-showcase__poster-mark">WPU</span>
        <span className="anthem-showcase__play" aria-hidden="true" />
        <span className="anthem-showcase__poster-title">
          National Anthem Broadcast
        </span>
      </button>
    );
  }

  return (
    <video
      ref={videoRef}
      className="anthem-showcase__video"
      controls
      preload="metadata"
    >
      <source src="/WPUAnthemFinal.mp4" type="video/mp4" />
    </video>
  );
}
