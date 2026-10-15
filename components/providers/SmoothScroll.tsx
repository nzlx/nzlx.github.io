"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/**
 * Lenis синхронизирован с GSAP: один общий тикер, ScrollTrigger
 * обновляется на каждое событие скролла. При prefers-reduced-motion — нативный скролл.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reduced) return;
    const instance = new Lenis({ lerp: 0.09, wheelMultiplier: 1, anchors: true, autoRaf: false });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    // Сглаживание лагов оставляем включённым: после фриза (например, компиляции шейдеров)
    // анимации продолжаются плавно, а не перескакивают в конец
    gsap.ticker.lagSmoothing(500, 33);
    setLenis(instance);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/** Плавная прокрутка к якорю (или нативная, если Lenis выключен) */
export function useScrollTo() {
  const lenis = useLenis();
  return (target: string | number) => {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6 });
      return;
    }
    if (typeof target === "number") window.scrollTo({ top: target });
    else document.querySelector(target)?.scrollIntoView();
  };
}
