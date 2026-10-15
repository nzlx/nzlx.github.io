"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useAppStore } from "@/lib/store";
import { useReducedMotion } from "@/lib/hooks";
import { content } from "@/data/content";
import { SplitLetters } from "@/components/ui/SplitText";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const introDone = useAppStore((s) => s.introDone);
  const reduced = useReducedMotion();
  const hero = content.sections.hero;

  useGSAP(
    () => {
      if (!introDone) return;
      if (reduced) {
        gsap.set(".char", { yPercent: 0, y: 0 });
        gsap.set(".hero-fade", { opacity: 1, y: 0 });
        return;
      }
      // Название появляется по буквам
      gsap
        .timeline({ delay: 0.15 })
        .fromTo(
          ".char",
          { yPercent: 115, rotate: 6 },
          { yPercent: 0, y: 0, rotate: 0, duration: 1.2, ease: "expo.out", stagger: 0.04 },
        )
        .fromTo(
          ".hero-fade",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 },
          "-=0.8",
        );

      // Уход заголовка при скролле
      gsap.to(".hero-title", {
        yPercent: -25,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: ref, dependencies: [introDone, reduced] },
  );

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex min-h-svh flex-col justify-between px-5 pb-8 pt-24 md:px-10 md:pb-10 md:pt-32"
    >
      <div className="hero-fade flex items-start justify-between text-xs uppercase tracking-[0.25em] text-muted opacity-0">
        <span>{hero.meta[0]}</span>
        <span className="text-right">{hero.meta[1]}</span>
      </div>

      <h1 className="hero-title pointer-events-none font-display font-medium uppercase leading-[0.85] tracking-[-0.04em] text-fg">
        <SplitLetters text={hero.eyebrow} className="mb-2 block text-[9vw] tracking-[0.02em] text-accent md:text-[4.5vw]" />
        <SplitLetters text={hero.title[0]} className="block text-[24vw] md:text-[16vw]" />
        <SplitLetters text={hero.title[1]} className="block text-right text-[24vw] md:text-[16vw]" />
      </h1>

      <div className="flex items-end justify-between gap-6">
        <div className="flex max-w-sm flex-col gap-4">
          <p className="hero-fade font-display text-xl leading-tight text-fg opacity-0 md:text-2xl">{hero.subtitle}</p>
          <span className="hero-fade flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-accent opacity-0">
            <span aria-hidden>←</span> {hero.rotateHint} <span aria-hidden>→</span>
          </span>
        </div>
        <div className="hero-fade flex flex-col items-center gap-3 opacity-0">
          <span className="text-[10px] uppercase tracking-[0.35em] text-muted [writing-mode:vertical-rl]">
            {hero.scrollHint}
          </span>
          <span className="scroll-hint relative block h-14 w-px overflow-hidden bg-fg/15" aria-hidden />
        </div>
      </div>
    </section>
  );
}
