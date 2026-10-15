"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@react-three/drei";
import { useAppStore } from "@/lib/store";
import { useReducedMotion } from "@/lib/hooks";
import { content } from "@/data/content";

/**
 * Счётчик 0 → 100%. Показывает реальный прогресс загрузки модели по байтам
 * (modelProgress из GLBCar); без модели — прогресс загрузчика three.js или время.
 * До 100 не доходит, пока сцена не отрисовала первые кадры.
 */
export function Preloader() {
  const { progress } = useProgress();
  const sceneReady = useAppStore((s) => s.sceneReady);
  const modelProgress = useAppStore((s) => s.modelProgress);
  const introDone = useAppStore((s) => s.introDone);
  const setIntroDone = useAppStore((s) => s.setIntroDone);
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const live = useRef({ progress, sceneReady, modelProgress });
  live.current = { progress, sceneReady, modelProgress };

  useEffect(() => {
    if (introDone) return;
    const start = performance.now();
    const minTime = reduced ? 300 : 1800;
    let value = 0;
    let raf = 0;
    let timeout = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const { progress, sceneReady, modelProgress } = live.current;
      // Реальные байты модели; если .glb не грузится — загрузчик three.js или время
      const real = modelProgress ?? Math.max(progress / 100, Math.min(1, elapsed / minTime));
      // Последние 5% — сборка сцены и первый кадр
      const target = sceneReady && elapsed >= minTime ? 100 : Math.min(95, real * 95);
      // Счётчик только растёт
      value += Math.max(0, target - value) * 0.12;
      if (target === 100 && value > 99.5) value = 100;
      setCount(Math.floor(value));
      if (value >= 100) {
        timeout = window.setTimeout(() => setIntroDone(true), 350);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [introDone, reduced, setIntroDone]);

  return (
    <AnimatePresence>
      {!introDone && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-bg p-6 md:p-10"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-label={`Загрузка ${count}%`}
        >
          <div className="flex justify-between text-xs uppercase tracking-[0.3em] text-muted">
            <span>
              {content.brand.make}
            </span>
            <span>{content.brand.model}</span>
          </div>
          <div className="flex items-end justify-between gap-6">
            <span className="max-w-[16ch] text-sm text-muted">{content.preloader.note}</span>
            <span className="font-display text-[22vw] font-medium leading-[0.8] tracking-tighter text-fg md:text-[14vw]">
              {count}
              <span className="text-accent">%</span>
            </span>
          </div>
          <span
            className="absolute bottom-0 left-0 h-[2px] bg-accent"
            style={{ width: `${count}%` }}
            aria-hidden
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
