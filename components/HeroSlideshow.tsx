"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HERO_SLIDES } from "@/content/hero-slides";

const INTERVAL_MS = 7000;
// How long before a slide's turn it starts downloading — long enough that a
// normal connection has it ready before the crossfade needs it, short
// enough that a visitor who leaves the homepage within the first rotation
// or two never triggers most of the later slides' downloads at all.
const LEAD_MS = 1500;

/** Cross-fading backdrop for the home page hero.
 *
 *  Purely decorative — aria-hidden, no controls, and it carries no meaning the
 *  copy doesn't already state, so there's nothing for a screen reader to miss.
 *
 *  Only the first slide renders on the server and during the initial paint,
 *  so it alone competes for LCP. The rest mount one at a time, each shortly
 *  before its own turn in the rotation — not all at once right after
 *  hydration, which would download every slide's full-width photo
 *  regardless of whether the visitor sticks around to see it. */
export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(1);

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;

    // A background that changes on its own is exactly what this setting is
    // for — leave it on the first slide instead.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const mountTimers = HERO_SLIDES.slice(1).map((_, i) => {
      const slideIndex = i + 1;
      const delay = Math.max(0, slideIndex * INTERVAL_MS - LEAD_MS);
      return setTimeout(() => setMounted((m) => Math.max(m, slideIndex + 1)), delay);
    });
    const rotate = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);

    return () => {
      mountTimers.forEach(clearTimeout);
      clearInterval(rotate);
    };
  }, []);

  const slides = HERO_SLIDES.slice(0, mounted);

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
