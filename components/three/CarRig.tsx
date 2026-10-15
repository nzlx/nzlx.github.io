"use client";

import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { drag, pointer, pose, stages, type StageKey } from "@/lib/scrollStages";
import { inspectRT } from "@/lib/inspect";

/**
 * Камера в сферических координатах вокруг цели.
 * az — азимут (0 = вид сбоку с +Z, нос машины в +X), el — возвышение, r — дистанция.
 */
/** pan — сдвиг кадра вбок (машина уходит в сторону, освобождая место тексту) */
type CamPose = { az: number; el: number; r: number; ty: number; pan: number };

const CAMERA: Record<"hero" | StageKey, CamPose> = {
  hero: { az: 0.75, el: 0.16, r: 8.2, ty: 0.55, pan: 0 },
  design: { az: -0.95, el: 0.36, r: 7.4, ty: 0.6, pan: -1.9 }, // облёт вокруг: двери открываются
  anatomy: { az: 0.3, el: 0.42, r: 14, ty: 1.1, pan: -0.6 }, // отъезд: по бокам колонки подписей, слева заголовок
  aero: { az: 0.15, el: 0.32, r: 17, ty: 1.7, pan: 0 }, // детали далеко, фоном под карточками
  specs: { az: 1.1, el: 0.25, r: 10, ty: 0.9, pan: 0 },
  finale: { az: 2.35, el: 0.05, r: 6.6, ty: 1.15, pan: 0 }, // низкий эффектный ракурс спереди
};

const ORDER: StageKey[] = ["design", "anatomy", "aero", "specs", "finale"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(cur, target, lambda, dt);

export function CarRig({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const smooth = useRef({ ...stages });
  const mouse = useRef({ x: 0, y: 0 });
  const spin = useRef(0);
  const target = useRef(new THREE.Vector3());
  const rigPos = useRef(new THREE.Vector3());
  const viewShift = useRef({ x: 0, y: 0 });
  const { camera, size } = useThree();

  // priority -1: поза считается раньше, чем её читают детали
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = smooth.current;
    const lambda = reduced ? 30 : 6;
    let scrolled = 0;
    for (const k of ORDER) {
      const next = damp(s[k], stages[k], lambda, dt);
      scrolled += Math.abs(next - s[k]);
      s[k] = next;
    }

    // --- Поза машины по этапам ---
    pose.doors = clamp01(s.design * (1 - s.finale));
    pose.explode = clamp01(s.anatomy - 0.5 * s.specs - 0.5 * s.finale);
    pose.labels = clamp01(s.anatomy * 1.5 - 0.5) * (1 - s.aero);
    pose.float = clamp01(s.aero) * (1 - s.finale);
    pose.lights = clamp01(s.finale * 1.4 - 0.4);
    pose.dim = clamp01(s.aero) * (1 - clamp01(s.specs * 1.5));

    // Под карточками аэродинамики сцена притушена, чтобы не мешать фото и тексту
    const opacity = (1 - pose.dim * 0.7).toFixed(2);
    const canvas = state.gl.domElement;
    if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;

    // --- Вращение в HERO + реакция на мышь ---
    const heroWeight = 1 - s.design;
    if (!reduced && s.design < 0.01) spin.current += dt * 0.22;
    // Угол в диапазоне [-π, π], чтобы при уходе из hero машина доворачивалась кратчайшим путём
    const wrapped = THREE.MathUtils.euclideanModulo(spin.current + Math.PI, Math.PI * 2) - Math.PI;
    mouse.current.x = damp(mouse.current.x, reduced ? 0 : pointer.x, 3, dt);
    mouse.current.y = damp(mouse.current.y, reduced ? 0 : pointer.y, 3, dt);

    // Инерция после перетаскивания
    if (!drag.active) {
      drag.yaw += drag.velocity * dt;
      drag.velocity *= Math.exp(-(reduced ? 12 : 2.5) * dt);
      // При прокрутке машина доворачивается в ракурс секции (ближайший полный оборот),
      // пока страница стоит — поворот пользователя сохраняется
      const home = Math.round(drag.yaw / (Math.PI * 2)) * Math.PI * 2;
      drag.yaw += (home - drag.yaw) * Math.min(1, scrolled * 6);
    }

    const g = group.current;
    if (g) {
      g.rotation.y = (wrapped + mouse.current.x * 0.4) * heroWeight + drag.yaw;
      g.rotation.x = -mouse.current.y * 0.06 * heroWeight;
    }

    // --- Камера: последовательная интерполяция между ракурсами секций ---
    const c = { ...CAMERA.hero };
    for (const k of ORDER) {
      const t = THREE.MathUtils.smootherstep(s[k], 0, 1);
      const p = CAMERA[k];
      c.az += (p.az - c.az) * t;
      c.el += (p.el - c.el) * t;
      c.r += (p.r - c.r) * t;
      c.ty += (p.ty - c.ty) * t;
      c.pan += (p.pan - c.pan) * t;
    }
    // Узкий/вертикальный экран — камера дальше, чтобы машина помещалась
    const aspect = size.width / size.height;
    const rMul = aspect < 0.8 ? 1.75 : aspect < 1.25 ? 1.3 : 1;
    // Лёгкий параллакс камеры за мышью
    c.az += mouse.current.x * 0.05;
    c.el += mouse.current.y * 0.03;

    const r = c.r * rMul;
    // На узких экранах текст идёт поверх машины — боковой сдвиг не нужен
    const pan = aspect < 1.25 ? 0 : c.pan;
    const px = Math.cos(c.az) * pan;
    const pz = -Math.sin(c.az) * pan;
    target.current.set(px, c.ty, pz);
    rigPos.current.set(
      px + r * Math.cos(c.el) * Math.sin(c.az),
      c.ty + r * Math.sin(c.el),
      pz + r * Math.cos(c.el) * Math.cos(c.az),
    );

    // --- Режим осмотра: камера смешивается из позы скролла в позу осмотра (k 0..1).
    // Пока работают OrbitControls — камеру не трогаем.
    const k = inspectRT.k;
    if (!inspectRT.controls) {
      camera.position.lerpVectors(rigPos.current, inspectRT.camPos, k);
      camera.lookAt(target.current.lerp(inspectRT.camTarget, k));
    }
    // Сдвиг кадра под панель: деталь — по центру свободной части экрана
    const cam = camera as THREE.PerspectiveCamera;
    const sx = Math.round(inspectRT.shiftX);
    const sy = Math.round(inspectRT.shiftY);
    if (sx !== viewShift.current.x || sy !== viewShift.current.y) {
      viewShift.current = { x: sx, y: sy };
      if (sx === 0 && sy === 0) cam.clearViewOffset();
      else cam.setViewOffset(size.width, size.height, sx, sy, size.width, size.height);
    }
    // Камера в координатах машины — к ней выдвигается выбранная деталь
    if (g) inspectRT.camLocal.copy(camera.position).applyMatrix4(g.matrixWorld.clone().invert());
  }, -1);

  return <group ref={group}>{children}</group>;
}
