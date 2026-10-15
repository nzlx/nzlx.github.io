"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { content } from "@/data/content";
import { FactCard } from "./FactCard";
import { SectionLabel } from "./SectionLabel";

/** Аэродинамика: детали парят в воздухе, поверх выезжают стеклянные карточки фактов */
export function Aero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const aero = content.sections.aero;

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();
      // desktop: карточки в сетке — фото проявляются с задержкой между карточками;
      // мобильные: карточки в колонку — каждая проявляется, как только подъезжает
      mm.add({ desktop: "(min-width: 768px)", mobile: "(max-width: 767px)" }, (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        gsap.utils.toArray<HTMLElement>(".fact-card").forEach((card, i) => {
          const photo = card.querySelector(".fact-photo");
          // Карточка «выезжает» снизу, затем фото «проявляется» снизу вверх (clip-path).
          // Всё привязано к скроллу и работает в обе стороны.
          gsap
            .timeline({
              scrollTrigger: { trigger: card, start: "top bottom", end: desktop ? "top 45%" : "top 70%", scrub: true },
            })
            .fromTo(card, { y: 160 + (i % 3) * 60, opacity: 0, rotateX: -12 }, { y: 0, opacity: 1, rotateX: 0, ease: "none", duration: 1 })
            .fromTo(
              photo,
              { clipPath: "inset(100% 0% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out", duration: 1 },
              desktop ? 0.35 + i * 0.15 : 0.25,
            );
        });
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section id="aero" ref={ref} className="relative px-5 pb-32 pt-44 md:pb-40 md:pl-10 md:pr-28 md:pt-56 lg:pr-36">
      <div className="mb-12 md:mb-16">
        <SectionLabel index={aero.index}>{aero.label}</SectionLabel>
        <h2 className="font-display text-5xl font-medium uppercase leading-[0.9] tracking-[-0.03em] md:text-8xl">{aero.title}</h2>
        <p className="mt-6 max-w-md text-fg/70">{aero.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:auto-rows-[260px] md:grid-cols-4 md:gap-5">
        {content.facts.map((fact, i) => (
          <FactCard key={fact.title} fact={fact} index={i} />
        ))}
      </div>
    </section>
  );
}
