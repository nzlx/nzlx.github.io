"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { content } from "@/data/content";
import { SectionLabel } from "./SectionLabel";

/** Характеристики: счётчики, привязанные к скроллу; детали начинают собираться обратно */
export function Specs() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const specs = content.sections.specs;

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".spec-value").forEach((el) => {
        const value = Number(el.dataset.value);
        const format = (v: number) => Math.round(v).toLocaleString("ru-RU");
        if (reduced) {
          el.textContent = format(value);
          return;
        }
        // Вверх по странице — числа уменьшаются обратно
        const counter = { v: 0 };
        gsap.to(counter, {
          v: value,
          ease: "power1.out",
          onUpdate: () => (el.textContent = format(counter.v)),
          scrollTrigger: { trigger: el, start: "top 90%", end: "top 45%", scrub: true },
        });
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section id="specs" ref={ref} className="relative px-5 py-32 md:px-10 md:py-48">
      <SectionLabel index={specs.index}>{specs.label}</SectionLabel>

      <div className="grid grid-cols-2 border-t border-line md:grid-cols-5">
        {content.specs.map((s, i) => (
          <div
            key={s.label}
            className={`border-b border-line bg-bg/30 py-8 pr-4 backdrop-blur-sm md:border-b-0 md:border-r md:py-12 md:pl-6 md:first:pl-0 md:last:border-r-0 ${
              i === content.specs.length - 1 ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <p className="font-display text-5xl font-medium leading-none tracking-tighter md:text-6xl lg:text-7xl">
              <span className="spec-value tabular-nums" data-value={s.value}>
                0
              </span>
            </p>
            <p className="mt-2 font-display text-lg text-accent">{s.unit}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted">{specs.note}</p>
    </section>
  );
}
