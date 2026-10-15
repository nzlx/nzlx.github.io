"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { pose } from "@/lib/scrollStages";
import {
  hitboxes,
  INSPECT_PANEL,
  inspectFlags,
  inspectRT,
  interactiveRT,
  meshesOf,
  nearestTarget,
  targets,
  useInspect,
  type Target,
} from "@/lib/inspect";

/** Не реагируем на наведение/клики поверх интерфейса */
const UI = "a, button, input, header, nav, [data-inspect-ui], .part-label, .fact-card";

const FLY = { duration: 1.2, ease: "power3.inOut" };
const raycaster = new THREE.Raycaster();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * Режим осмотра: наведение (raycast только по хит-боксам), клики/тапы, клавиши,
 * перелёты камеры (GSAP) и OrbitControls у выбранной детали.
 */
export function Inspector({ fine }: { fine: boolean }) {
  const { camera, size } = useThree();
  const [orbit, setOrbit] = useState<{ min: number; max: number } | null>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const pointer = useRef({ x: 0, y: 0, moved: false, overUI: true });

  /** Куда поставить камеру, чтобы деталь занимала ~60% свободной части экрана, ракурс 3/4 */
  const poseFor = (t: Target) => {
    const mobile = size.width < 768;
    const sphere = new THREE.Box3().setFromObject(t.hitbox).getBoundingSphere(new THREE.Sphere());
    const c = sphere.center;
    const r = Math.max(sphere.radius, 0.25);
    // Направление: от центра машины к детали, смешанное с текущей стороной камеры — и поворот на 3/4
    const camSide = camera.position.clone().sub(c).setY(0).normalize();
    const out = new THREE.Vector3(c.x, 0, c.z);
    const dir = (out.lengthSq() > 0.09 ? out.normalize().add(camSide).normalize() : camSide).applyAxisAngle(Y, 0.45);
    const elev = 0.36;
    const dir3 = new THREE.Vector3(dir.x * Math.cos(elev), Math.sin(elev), dir.z * Math.cos(elev));
    // Свободная часть кадра — без панели (справа на десктопе, снизу на мобильных)
    const cam = camera as THREE.PerspectiveCamera;
    const halfV = THREE.MathUtils.degToRad(cam.fov) / 2;
    const freeW = size.width - (mobile ? 0 : INSPECT_PANEL.width);
    const freeH = size.height * (mobile ? 1 - INSPECT_PANEL.sheet : 1);
    const halfFree = Math.min(Math.atan((Math.tan(halfV) * freeW) / size.height), Math.atan((Math.tan(halfV) * freeH) / size.height));
    const d = r / (Math.tan(halfFree) * 0.6);
    return { pos: c.clone().addScaledVector(dir3, d), target: c.clone(), d };
  };

  const select = (t: Target, enter: boolean) => {
    const mobile = size.width < 768;
    const p = poseFor(t);
    inspectRT.selectedKey = t.key;
    inspectRT.selectedPos.copy(t.piece.position);
    inspectRT.spin = 0;
    inspectRT.controls = false;
    setOrbit(null);
    gsap.killTweensOf([inspectRT, inspectRT.camPos, inspectRT.camTarget]);
    const done = () => {
      inspectRT.controls = true;
      setOrbit({ min: p.d * 0.55, max: p.d * 1.8 });
    };
    if (enter) {
      // Вход: камера смешивается из позы скролла в позу осмотра (k: 0 → 1, см. CarRig)
      inspectRT.camPos.copy(p.pos);
      inspectRT.camTarget.copy(p.target);
    } else {
      // Переключение: перелёт от текущей камеры к следующей детали
      gsap.to(inspectRT.camPos, { x: p.pos.x, y: p.pos.y, z: p.pos.z, ...FLY });
      gsap.to(inspectRT.camTarget, { x: p.target.x, y: p.target.y, z: p.target.z, ...FLY });
    }
    // Даже если переключились во время подлёта — вход доводится до конца
    gsap.to(inspectRT, {
      k: 1,
      amount: 1,
      shiftX: mobile ? 0 : INSPECT_PANEL.width / 2,
      shiftY: mobile ? (size.height * INSPECT_PANEL.sheet) / 2 : 0,
      ...FLY,
      onComplete: done,
    });
  };

  const exit = () => {
    inspectRT.controls = false;
    setOrbit(null);
    gsap.killTweensOf([inspectRT, inspectRT.camPos, inspectRT.camTarget]);
    gsap.to(inspectRT, {
      k: 0,
      amount: 0,
      shiftX: 0,
      shiftY: 0,
      ...FLY,
      onComplete: () => void (inspectRT.selectedKey = null),
    });
  };

  // Реакция на выбор в интерфейсе: вход, переключение, выход
  useEffect(() => {
    return useInspect.subscribe((s, prev) => {
      if (s.selected === prev.selected && s.selectedKey === prev.selectedKey) return;
      if (!s.selected) return exit();
      const t = (s.selectedKey && targets.get(s.selectedKey)) || nearestTarget(s.selected, camera);
      if (!t) return useInspect.getState().close();
      select(t, !prev.selected);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height]);

  const hit = (x: number, y: number) => {
    raycaster.setFromCamera(new THREE.Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
    const h = raycaster.intersectObjects(hitboxes(), false)[0];
    return h ? [...targets.values()].find((t) => t.hitbox === h.object) ?? null : null;
  };

  // Указатель, клики/тапы, клавиатура
  useEffect(() => {
    let down: { x: number; y: number; t: number; ui: boolean } | null = null;
    const isUI = (e: Event) => !!(e.target as Element | null)?.closest?.(UI);

    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, moved: true, overUI: isUI(e) };
    };
    const pdown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), ui: isUI(e) || e.button !== 0 };
    };
    const pup = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || d.ui || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
      const state = useInspect.getState();
      const t = hit(e.clientX, e.clientY);
      if (state.selected) {
        // В режиме осмотра: клик по другой детали — переключение, по пустому месту — выход
        if (!t) state.close();
        else if (t.key !== inspectRT.selectedKey) state.open(t.id, t.key);
      } else if (interactiveRT.enabled && t) {
        state.open(t.id, t.key);
      }
    };
    const key = (e: KeyboardEvent) => {
      const s = useInspect.getState();
      if (!s.selected) return;
      if (e.key === "Escape") s.close();
      if (e.key === "ArrowRight") s.step(1);
      if (e.key === "ArrowLeft") s.step(-1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", pdown);
    window.addEventListener("pointerup", pup);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", pdown);
      window.removeEventListener("pointerup", pup);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height]);

  useFrame((_, dt) => {
    // Детали кликабельны только в разобранном виде, пока на экране «Устройство»
    interactiveRT.enabled = pose.explode > 0.8 && pose.labels > 0.6;
    inspectFlags.busy = inspectRT.k > 0;
    const s = useInspect.getState();

    // Наведение — только мышью (на тач-устройствах — тап, без подсветки)
    const p = pointer.current;
    if (fine && p.moved) {
      p.moved = false;
      if (!p.overUI) {
        const t = interactiveRT.enabled || s.selected ? hit(p.x, p.y) : null;
        const hover = t && t.key !== inspectRT.selectedKey ? t : null;
        if (hover?.key !== s.hoveredKey) s.setHover(hover?.id ?? null, hover?.key ?? null, hover ? meshesOf(hover.piece) : []);
      }
    }
    if (!interactiveRT.enabled && !s.selected && s.hovered) s.setHover(null);

    // Медленное вращение выбранной детали; камера следует за OrbitControls
    if (inspectRT.selectedKey) inspectRT.spin = THREE.MathUtils.euclideanModulo(inspectRT.spin + dt * 0.18 + Math.PI, Math.PI * 2) - Math.PI;
    if (inspectRT.controls && controls.current) {
      inspectRT.camPos.copy(camera.position);
      inspectRT.camTarget.copy(controls.current.target);
    }
  });

  return orbit ? (
    <OrbitControls
      ref={controls}
      target={inspectRT.camTarget.toArray()}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      minDistance={orbit.min}
      maxDistance={orbit.max}
    />
  ) : null;
}
