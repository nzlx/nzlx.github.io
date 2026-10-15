"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { pointer, resetStages, stages, type StageKey } from "@/lib/scrollStages";
import { useAppStore } from "@/lib/store";
import { useDragRotate } from "@/lib/useDragRotate";
import { useLenis } from "@/components/providers/SmoothScroll";
import { Preloader } from "@/components/ui/Preloader";
import { Header } from "@/components/ui/Header";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Marquee } from "@/components/ui/Marquee";
import { InspectPanel } from "@/components/ui/InspectPanel";
import { Hero } from "@/components/sections/Hero";
import { Design } from "@/components/sections/Design";
import { Anatomy } from "@/components/sections/Anatomy";
import { Aero } from "@/components/sections/Aero";
import { Specs } from "@/components/sections/Specs";
import { Finale } from "@/components/sections/Finale";

// three.js только на клиенте и отдельным чанком (ленивая загрузка)
const Scene = dynamic(() => import("@/components/three/Scene"), { ssr: false });

/**
 * Этапы анимации машины. Каждый — отдельный ScrollTrigger со scrub: true,
 * анимирующий своё свойство в объекте `stages` от 0 до 1 (и обратно при скролле вверх).
 */
const STAGES: { key: StageKey; trigger: string; start: string; end: string }[] = [
  { key: "design", trigger: "#design", start: "top bottom", end: "center center" },
  { key: "anatomy", trigger: "#anatomy", start: "top 70%", end: "top -20%" },
  { key: "aero", trigger: "#aero", start: "top bottom", end: "top 20%" },
  { key: "specs", trigger: "#specs", start: "top bottom", end: "center center" },
  { key: "finale", trigger: "#finale", start: "top bottom", end: "bottom bottom" },
];

export function HomePage() {
  const introDone = useAppStore((s) => s.introDone);
  const lenis = useLenis();
  useDragRotate();

  useGSAP(() => {
    resetStages();
    STAGES.forEach(({ key, trigger, start, end }) => {
      gsap.to(stages, {
        [key]: 1,
        ease: "none",
        scrollTrigger: { trigger, start, end, scrub: true, invalidateOnRefresh: true },
      });
    });
  });

  // Блокируем скролл, пока идёт прелоадер
  useEffect(() => {
    if (introDone) {
      lenis?.start();
      document.documentElement.style.overflow = "";
      ScrollTrigger.refresh();
      return;
    }
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
  }, [introDone, lenis]);

  // Позиция курсора для реакции машины в hero
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  // Шрифты подгрузились — пересчитать позиции триггеров
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <>
      <Preloader />
      <Scene />
      <Header />
      <ScrollProgress />
      <InspectPanel />
      <main className="relative z-10">
        <Hero />
        <Marquee />
        <Design />
        <Anatomy />
        <Marquee reverse />
        <Aero />
        <Specs />
        <Finale />
      </main>
    </>
  );
}
