"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pose } from "@/lib/scrollStages";
import { canExplode, EXPLODE, layerProgress, type InspectId, type PartKey, type Signs } from "@/lib/carParts";
import { createHitbox, inspectRT, localBox, registerPiece, registerTarget, setGhost } from "@/lib/inspect";

/** Состояние куска в режиме осмотра: насколько он «выбран» и насколько прозрачен */
const pieceState = new Map<string, { sel: number; ghost: number }>();
const tmp = new THREE.Vector3();

/**
 * Ставит группу детали в позу разборки. Поза — чистая функция от pose.explode,
 * поэтому при скролле вверх деталь возвращается ровно по тому же пути.
 * Поверх — эффекты режима осмотра (выдвижение, вращение, затухание, отъезд).
 */
export function applyExplode(
  obj: THREE.Object3D,
  base: THREE.Vector3,
  part: PartKey,
  signs: Signs,
  active: boolean,
  time: number,
  phase: number,
  key: string,
) {
  const spec = EXPLODE[part];
  const e = active ? layerProgress(spec.layer, pose.explode) : 0;
  const [ox, oy, oz] = spec.offset(signs);
  const [rx, ry, rz] = spec.spin(signs);
  // «Парение» деталей в секции аэродинамики
  const bob = pose.float * e * Math.sin(time * 1.1 + phase) * 0.1;
  const wobble = pose.float * e * Math.sin(time * 0.7 + phase) * 0.05;
  obj.position.set(base.x + ox * e, base.y + oy * e + bob, base.z + oz * e);
  obj.rotation.set(rx * e + wobble, ry * e + wobble * 0.5, rz * e);

  // --- Режим осмотра ---
  let st = pieceState.get(key);
  if (!st) pieceState.set(key, (st = { sel: 0, ghost: 0 }));
  const selected = key === inspectRT.selectedKey;
  st.sel += ((selected ? 1 : 0) - st.sel) * 0.12;
  const ghostTarget = selected ? 0 : inspectRT.amount;
  const ghost = Math.abs(ghostTarget - st.ghost) < 0.003 ? ghostTarget : st.ghost + (ghostTarget - st.ghost) * 0.15;
  if (ghost !== st.ghost) setGhost(obj, (st.ghost = ghost));

  const a = inspectRT.amount;
  if (a <= 0) return;
  // Выбранная деталь чуть выдвигается к камере и медленно вращается
  if (st.sel > 0.001) {
    tmp.copy(inspectRT.camLocal).sub(obj.position).normalize();
    obj.position.addScaledVector(tmp, 0.28 * st.sel * a);
    obj.rotation.y += inspectRT.spin * st.sel * a;
  }
  // Остальные слегка отъезжают от выбранной
  if (st.sel < 0.999) {
    tmp.copy(obj.position).sub(inspectRT.selectedPos);
    if (tmp.lengthSq() > 1e-6) obj.position.addScaledVector(tmp.normalize(), 0.35 * (1 - st.sel) * a);
  }
}

type Props = {
  part: PartKey;
  signs?: Signs;
  position: [number, number, number];
  lite: boolean;
  /** Группа осмотра: деталь кликабельна и открывает карточку */
  inspect?: InspectId;
  /** Показывать только во время разборки (внутренние детали спрятаны в кузове) */
  hiddenWhenAssembled?: boolean;
  children: ReactNode;
};

/** Группа процедурной детали, которая разбирается по тому же сценарию, что и детали модели */
export function ExplodingGroup({ part, signs = { sx: 0, sz: 0 }, position, lite, inspect, hiddenWhenAssembled, children }: Props) {
  const ref = useRef<THREE.Group>(null);
  const base = useMemo(() => new THREE.Vector3(...position), [position]);
  const phase = useMemo(() => (position[0] * 7.13 + position[2] * 3.7) % (Math.PI * 2), [position]);
  const active = canExplode(part, lite);
  const key = `${part}|${signs.sx}|${signs.sz}`;

  // Регистрация в режиме осмотра: кусок (для затухания) и хит-бокс по габариту детали
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const offPiece = registerPiece(key, g);
    if (!inspect || !active) return offPiece;
    const hitbox = createHitbox(localBox(g));
    g.add(hitbox);
    const offTarget = registerTarget({ id: inspect, key, piece: g, hitbox });
    return () => {
      offTarget();
      offPiece();
      g.remove(hitbox);
      hitbox.geometry.dispose();
    };
  }, [key, inspect, active]);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    applyExplode(g, base, part, signs, active, state.clock.elapsedTime, phase, key);
    if (hiddenWhenAssembled) g.visible = pose.explode > 0.12;
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
