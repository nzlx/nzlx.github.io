"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useFinePointer } from "@/lib/hooks";
import { useInspect } from "@/lib/inspectStore";
import { content } from "@/data/content";

const INTERACTIVE = "a, button, [role='button'], [data-cursor]";

/**
 * Кастомный курсор: кружок, увеличивается над ссылками/кнопками, может показывать подпись.
 * Над деталью в 3D (или её подписью) — «лупа» с подписью «Осмотреть».
 */
export function Cursor() {
  const fine = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [zoomEl, setZoomEl] = useState(false);
  // Деталь под курсором в 3D (raycast в Inspector)
  const partHovered = useInspect((s) => s.hovered !== null);

  useEffect(() => {
    const el = ref.current;
    if (!fine || !el) return;
    document.documentElement.classList.add("has-cursor");
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });

    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      el.style.opacity = "1";
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.(INTERACTIVE);
      setHover(!!target);
      setLabel(target?.getAttribute("data-cursor") || null);
      setZoomEl(target?.getAttribute("data-cursor-icon") === "zoom");
    };
    const leave = () => (el.style.opacity = "0");

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [fine]);

  if (!fine) return null;

  const zoom = zoomEl || (partHovered && !hover);
  const text = label ?? (zoom ? content.inspect.cursor : null);

  return (
    <div ref={ref} className="cursor" data-hover={hover} data-label={!!text} data-zoom={zoom} aria-hidden>
      <span className="cursor__circle" />
      {text && (
        <span className="cursor__label">
          {zoom && (
            <svg className="cursor__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" strokeLinecap="round" />
            </svg>
          )}
          {text}
        </span>
      )}
    </div>
  );
}
