import { ReactNode } from "react";

/**
 * Shared inner-page hero — the reference design's dark eco band:
 * deep green-black gradient with a dotted halftone, a green `//` eyebrow,
 * a heavy display title and an irregular wave seam into the page body.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Extra content rendered below the description (CTAs, back links…). */
  children?: ReactNode;
}) {
  return (
    <section className="dark-eco-gradient relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:pb-20 lg:pt-16">
        {eyebrow && (
          <span className="eyebrow mb-3 block text-[var(--brand-green-bright)]">
            <span>{"// "}</span>
            {eyebrow}
          </span>
        )}
        <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-[3rem]">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-white/75 leading-relaxed">{description}</p>}
        {children}
      </div>
      {/* Wave seam into the page body */}
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute bottom-0 left-0 block h-8 w-full fill-background"
      >
        <path d="M0 30 C 120 12 260 10 400 20 C 560 32 700 40 880 34 C 1060 28 1180 10 1320 12 C 1370 13 1410 16 1440 20 L 1440 48 L 0 48 Z" />
      </svg>
    </section>
  );
}
