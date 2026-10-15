"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { content } from "@/data/content";
import { SplitWords } from "@/components/ui/SplitText";
import { SectionLabel } from "./SectionLabel";

/** Дизайн: камера облетает машину, двери synchro-helix открываются */
export function Design() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const design = content.sections.design;

  useGSAP(
    () => {
      if (reduced) {
        gsap.set(".word", { opacity: 1 });
        return;
      }
      // Текст проявляется по словам вместе со скроллом
      gsap.to(".word", {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: ".design-text", start: "top 80%", end: "bottom 45%", scrub: true },
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section id="design" ref={ref} className="relative flex min-h-[160svh] items-center px-5 py-32 md:px-10">
      <div className="w-full max-w-2xl md:w-1/2">
        <SectionLabel index={design.index}>{design.label}</SectionLabel>
        <p className="design-text font-display text-3xl font-medium leading-[1.15] tracking-tight text-fg md:text-5xl">
          <SplitWords text={design.text} />
        </p>
        <p className="mt-10 text-sm uppercase tracking-[0.25em] text-accent">{design.note}</p>
      </div>
    </section>
  );
}
