"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Hero image slider — no-code content managed in Admin → Settings.
 * Fast auto-advance crossfade between up to 12 images at a millisecond-tunable
 * pace (admin sets ms/slide; default 800ms), brand glow frame (.glow-frame
 * breathes; .glow-border sweeps a comet on hover), dot controls.
 * Auto-advance pauses while hovered/focused so visitors can look (or click a dot).
 */
export function HeroSlider({
  images,
  intervalMs = 800,
  className = "",
  priorityFirst = false,
  controls = true,
}: {
  images: string[];
  intervalMs?: number;
  /** Extra classes for the outer frame (sizing lives with the caller). */
  className?: string;
  /** Eagerly load the first slide (homepage above the fold). */
  priorityFirst?: boolean;
  /** Show dot controls (off for the read-only admin preview). */
  controls?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Crossfade length scales with the slide pace so very fast intervals don't smear.
  const fadeMs = Math.min(700, Math.max(250, Math.round(intervalMs * 0.45)));

  // Restart the timer whenever the pause state, speed or slide count changes.
  useEffect(() => {
    if (paused || images.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % images.length), Math.max(200, intervalMs));
    return () => clearInterval(id);
  }, [paused, intervalMs, images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className={`glow-frame glow-border group relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-testid="hero-slider"
      data-active={active}
    >
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          aria-hidden={i !== active}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{ opacity: i === active ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
        >
          <Image
            src={src}
            alt={`Showcase image ${i + 1} of ${images.length}`}
            fill
            sizes="(max-width: 1024px) 100vw, 44vw"
            priority={priorityFirst && i === 0}
            className="object-cover"
            draggable={false}
          />
        </div>
      ))}
      {/* Legibility gradient at the bottom edge + dot controls */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />
      {controls && images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" role="tablist" aria-label="Hero images">
          {images.map((src, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === active
                  ? "w-6 bg-white shadow-[0_0_10px_2px_rgba(38,172,71,0.65)]"
                  : "w-2.5 bg-white/55 hover:bg-white/85"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
