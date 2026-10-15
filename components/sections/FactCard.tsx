"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { PointerEvent } from "react";
import type { Fact } from "@/data/content";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";

const SIZE_CLASSES: Record<Fact["size"], string> = {
  large: "md:col-span-2 md:row-span-2",
  tall: "md:row-span-2",
  wide: "md:col-span-2",
  small: "",
};

const SIZES: Record<Fact["size"], string> = {
  large: "(max-width: 768px) 100vw, 50vw",
  wide: "(max-width: 768px) 100vw, 50vw",
  tall: "(max-width: 768px) 100vw, 25vw",
  small: "(max-width: 768px) 100vw, 25vw",
};

/**
 * Карточка факта: фото на фоне (непрозрачная, без размытия), тёмный градиент под текстом,
 * наклон за курсором. Без кликов и переходов.
 * Проявление фото при скролле анимирует секция (`.fact-photo`, clip-path).
 */
export function FactCard({ fact, index }: { fact: Fact; index: number }) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const tilt = fine && !reduced;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.4 };
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(500px circle at ${x} ${y}, rgba(200,255,0,0.14), transparent 45%)`,
  );

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const large = fact.size === "large";

  return (
    <div className={`fact-card [perspective:1000px] ${SIZE_CLASSES[fact.size]}`}>
      <motion.article
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={tilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="group relative h-full min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-[#111214] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:min-h-[240px]"
      >
        {/* Фото — фон карточки */}
        <div className="fact-photo absolute inset-0">
          <Image
            src={fact.photo.src}
            alt={fact.photo.alt}
            fill
            loading="lazy"
            sizes={SIZES[fact.size]}
            className="object-cover brightness-[0.72] saturate-[0.9] transition-[scale,filter] duration-700 ease-out group-hover:scale-105 group-hover:brightness-100 group-hover:saturate-100"
            style={{ objectPosition: fact.photo.position }}
          />
        </div>
        {/* Тёмный градиент снизу вверх — под текстом */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />

        {tilt && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: glare }}
          />
        )}

        <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
          <span className="text-xs uppercase tracking-[0.2em] text-accent">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3 className={`font-display font-medium tracking-tight text-white ${large ? "text-4xl md:text-6xl" : "text-2xl md:text-3xl"}`}>
              {fact.title}
            </h3>
            <p className={`mt-3 text-white/75 ${large ? "max-w-md text-base md:text-lg" : "text-sm"}`}>{fact.text}</p>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
