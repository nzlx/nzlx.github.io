"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { pose } from "@/lib/scrollStages";
import { canExplode, type PartKey } from "@/lib/carParts";

type Vec3 = [number, number, number];

/** lite-режим (мобильные): разлетается меньше деталей */
export const LiteContext = createContext(false);

type PartProps = {
  part: PartKey;
  position?: Vec3;
  /** Смещение детали при полном разлёте */
  explode: Vec3;
  /** Поворот детали при полном разлёте */
  spin?: Vec3;
  children: ReactNode;
};

/**
 * Деталь машины. В собранном виде стоит в `position`,
 * при разлёте смещается на `explode` и поворачивается на `spin`.
 */
export function Part({
  part,
  position = [0, 0, 0],
  explode,
  spin = [0, 0, 0],
  children,
}: PartProps) {
  const ref = useRef<Group>(null);
  const lite = useContext(LiteContext);
  const active = canExplode(part, lite);
  // Фаза «парения» у каждой детали своя
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const e = active ? pose.explode : 0;
    const t = state.clock.elapsedTime;
    const bob = pose.float * e * Math.sin(t * 1.1 + phase.current) * 0.12;
    const wobble = pose.float * e * Math.sin(t * 0.7 + phase.current) * 0.08;
    g.position.set(
      position[0] + explode[0] * e,
      position[1] + explode[1] * e + bob,
      position[2] + explode[2] * e,
    );
    g.rotation.set(spin[0] * e + wobble, spin[1] * e + wobble * 0.5, spin[2] * e);
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

type HingeProps = {
  /** Точка опоры (петля) */
  pivot: Vec3;
  /** Угол открытия по осям при pose.doors = 1 */
  open: Vec3;
  children: ReactNode;
};

/** Петля для дверей и капота: вращает детей вокруг pivot */
export function Hinge({ pivot, open, children }: HingeProps) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const d = pose.doors;
    ref.current?.rotation.set(open[0] * d, open[1] * d, open[2] * d);
  });
  return (
    <group ref={ref} position={pivot}>
      {children}
    </group>
  );
}
