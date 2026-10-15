"use client";

import { useEffect } from "react";
import { drag } from "./scrollStages";
import { isInspecting } from "./inspectStore";

/** Перетаскивание не начинается на интерактивных элементах */
const EXCLUDE = "a, button, input, textarea, select, label, [role='button'], .fact-card, .part-label, [data-inspect-ui], [data-no-drag]";
/** Полный проход по ширине экрана — 1.6 оборота */
const TURNS_PER_SCREEN = 1.6;

/**
 * Вращение машины перетаскиванием в любом пустом месте страницы.
 * Жест считается вращением, только если он в основном горизонтальный —
 * вертикальные свайпы на телефоне продолжают прокручивать страницу.
 */
export function useDragRotate() {
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let lastX = 0;
    let lastT = 0;

    const end = () => {
      start = null;
      drag.active = false;
      document.documentElement.classList.remove("is-dragging-car");
    };

    const down = (e: PointerEvent) => {
      // В режиме осмотра вращение — у OrbitControls
      if (e.button !== 0 || isInspecting() || (e.target as Element | null)?.closest?.(EXCLUDE)) return;
      start = { x: e.clientX, y: e.clientY };
      lastX = e.clientX;
      lastT = performance.now();
      drag.velocity = 0;
    };

    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!drag.active) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) return end(); // это прокрутка
        if (Math.abs(dx) < 6) return;
        drag.active = true;
        document.documentElement.classList.add("is-dragging-car");
        window.getSelection()?.removeAllRanges();
      }
      const now = performance.now();
      const delta = ((e.clientX - lastX) / window.innerWidth) * Math.PI * 2 * TURNS_PER_SCREEN;
      drag.yaw += delta;
      const dt = Math.max(1, now - lastT) / 1000;
      // Сглаженная скорость — для инерции после отпускания
      drag.velocity = drag.velocity * 0.6 + (delta / dt) * 0.4;
      lastX = e.clientX;
      lastT = now;
    };

    const up = () => {
      // Если палец/мышь стояли на месте перед отпусканием — без инерции
      if (performance.now() - lastT > 80) drag.velocity = 0;
      end();
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", end);
      end();
    };
  }, []);
}
