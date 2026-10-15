"use client";

import { useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useScrollTo } from "@/components/providers/SmoothScroll";
import { content } from "@/data/content";

/** Секции страницы — из data/content.ts */
const SECTIONS = content.progress;

/** Вертикальный индикатор прогресса скролла + точки секций */
export function ScrollProgress() {
  const fill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const scrollTo = useScrollTo();

  useGSAP(() => {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (fill.current) fill.current.style.transform = `scaleY(${self.progress})`;
      },
    });
    SECTIONS.forEach((s, i) => {
      ScrollTrigger.create({
        trigger: `#${s.id}`,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => self.isActive && setActive(i),
      });
    });
  });

  return (
    <nav
      aria-label="Разделы"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-4 md:flex lg:right-8"
    >
      <ul className="flex flex-col items-end gap-3">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => scrollTo(`#${s.id}`)}
              className="group flex items-center gap-3 py-1"
              aria-current={active === i ? "true" : undefined}
            >
              <span
                className={`text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${
                  active === i ? "translate-x-0 text-fg opacity-100" : "translate-x-2 text-muted opacity-0 group-hover:opacity-100"
                }`}
              >
                {s.label}
              </span>
              <span
                className={`block h-px transition-all duration-500 ${active === i ? "w-6 bg-accent" : "w-3 bg-fg/30"}`}
              />
            </button>
          </li>
        ))}
      </ul>
      <span className="relative block h-40 w-px overflow-hidden bg-fg/10">
        <span ref={fill} className="absolute inset-0 origin-top scale-y-0 bg-accent" />
      </span>
    </nav>
  );
}
