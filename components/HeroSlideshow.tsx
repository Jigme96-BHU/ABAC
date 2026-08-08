"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HERO_SLIDES } from "@/content/hero-slides";

const INTERVAL_MS = 7000;

/** Cross-fading backdrop for the home page hero.
 *
 *  Purely decorative — aria-hidden, no controls, and it carries no meaning the
 *  copy doesn't already state, so there's nothing for a screen reader to miss.
 *
 *  Only the first slide renders on the server and during the initial paint, so
 *  it alone competes for LCP; the rest mount after hydration. Without that,
 *  every slide would download immediately (they all sit inside the viewport,
 *  so lazy loading would never defer them). */
export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;

    // A background that changes on its own is exactly what this setting is
    // for — leave it on the first slide instead.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setArmed(true);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const slides = armed ? HERO_SLIDES : HERO_SLIDES.slice(0, 1);

  return (
    <div className="hero-slides" aria-hidden="true">
      {slides.map((slide, i) => (
        <Image
          key={slide.src.src}
          src={slide.src}
          alt=""
          fill
          sizes="100vw"
          className="hero-bg"
          style={{ objectPosition: slide.position, opacity: i === index ? 1 : 0 }}
          placeholder="blur"
          priority={i === 0}
        />
      ))}
    </div>
  );
}
