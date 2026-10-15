"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { content } from "@/data/content";
import { availableIds, useInspect } from "@/lib/inspectStore";
import { useIsMobile } from "@/lib/hooks";
import { useLenis } from "@/components/providers/SmoothScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Панель режима осмотра: справа на десктопе, снизу (bottom sheet) на мобильных.
 * Пока она открыта, скролл страницы заблокирован (Lenis + overflow).
 */
export function InspectPanel() {
  const selected = useInspect((s) => s.selected);
  const step = useInspect((s) => s.step);
  const close = useInspect((s) => s.close);
  const lenis = useLenis();
  const mobile = useIsMobile();
  const wasOpen = useRef(false);

  // Блокировка скролла и подъём 3D-слоя над страницей.
  // Разблокируем только при выходе из осмотра — чтобы не снять блокировку прелоадера.
  useEffect(() => {
    const html = document.documentElement;
    if (selected) {
      wasOpen.current = true;
      lenis?.stop();
      html.style.overflow = "hidden";
      html.classList.add("is-inspecting");
    } else if (wasOpen.current) {
      wasOpen.current = false;
      lenis?.start();
      html.style.overflow = "";
      html.classList.remove("is-inspecting");
    }
  }, [selected, lenis]);

  const part = content.parts.find((p) => p.id === selected);
  const ids = selected ? availableIds() : [];
  const index = selected ? ids.indexOf(selected) : -1;
  const t = content.inspect;

  return (
    <AnimatePresence>
      {part && (
        <motion.aside
          key="inspect-panel"
          data-inspect-ui
          role="dialog"
          aria-label={part.title}
          className="inspect-panel"
          initial={mobile ? { y: "100%" } : { x: "100%" }}
          animate={mobile ? { y: 0 } : { x: 0 }}
          exit={mobile ? { y: "100%" } : { x: "100%" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted">
            <span>
              <span className="text-accent">{String(index + 1).padStart(2, "0")}</span> / {String(ids.length).padStart(2, "0")}
            </span>
            <button type="button" onClick={close} aria-label={t.close} className="inspect-panel__close">
              ✕
            </button>
          </div>

          {/* Смена детали — мягкая смена текста */}
          <AnimatePresence mode="wait">
            <motion.div
              key={part.id}
              className="mt-6 flex-1 overflow-y-auto md:mt-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <h2 className="font-display text-3xl font-medium leading-none tracking-tight text-fg md:text-5xl">{part.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-fg/75 md:mt-6 md:text-base">{part.description}</p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-muted md:mt-8">{t.specsTitle}</p>
              <ul className="mt-3 flex flex-col">
                {part.specs.map((s) => (
                  <li key={s} className="inspect-panel__spec">
                    {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 border-t border-line pt-5">
            <div className="flex justify-between gap-3">
              <button type="button" onClick={() => step(-1)} className="inspect-panel__nav">
                {t.prev}
              </button>
              <button type="button" onClick={() => step(1)} className="inspect-panel__nav">
                {t.next}
              </button>
            </div>
            <p className="mt-4 hidden text-[10px] uppercase tracking-[0.2em] text-muted md:block">{t.hint}</p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
