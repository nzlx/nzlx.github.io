"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { pose } from "@/lib/scrollStages";
import { useAppStore } from "@/lib/store";
import {
  canExplode,
  classifyNode,
  DOOR,
  inspectGroupOf,
  isLightNode,
  MODEL,
  PART_KEYS,
  type NodeInfo,
  type PartKey,
  type Signs,
} from "@/lib/carParts";
import { applyExplode } from "./explode";
import { createHitbox, registerPiece, registerTarget } from "@/lib/inspect";
import { createJeskoMaterials, pickMaterial, updateJeskoLights, type JeskoMaterials } from "./jeskoMaterials";
import { JeskoInternals, type CarLayout } from "./JeskoInternals";

/** Экземпляр детали: одна группа на сцене (колесо, левая дверь, левые панели кузова…) */
type Instance = {
  id: string;
  part: PartKey;
  signs: Signs;
  group: THREE.Group;
  base: THREE.Vector3;
  size: THREE.Vector3;
  phase: number;
  active: boolean;
  door?: { hinge: THREE.Group; hingeBase: THREE.Vector3; axis: THREE.Vector3; shift: THREE.Vector3 };
};

/** Размеры моделей в байтах (next.config.ts → env) */
const MODEL_SIZE = {
  desktop: Number(process.env.NEXT_PUBLIC_MODEL_SIZE_DESKTOP) || 0,
  mobile: Number(process.env.NEXT_PUBLIC_MODEL_SIZE_MOBILE) || 0,
};

const sign = (v: number, dead = 0) => (Math.abs(v) <= dead ? 0 : Math.sign(v));

/** Детали с несколькими экземплярами разлетаются «от центра» по своей стороне */
function instanceSigns(part: PartKey, c: THREE.Vector3): Signs {
  if (part === "brakes") return { sx: sign(c.x), sz: sign(c.z) };
  if (part === "lights") return { sx: sign(c.x), sz: 0 };
  if (part.startsWith("wheel_")) return { sx: sign(c.x), sz: sign(c.z) };
  return { sx: 0, sz: 0 };
}

/** Имя узла glTF (three.js «санитизирует» имена — оригинал лежит в userData.name) */
const nodeOf = (mesh: THREE.Object3D): THREE.Object3D =>
  mesh.userData.name !== undefined ? mesh : mesh.parent && mesh.parent.userData.name !== undefined ? mesh.parent : mesh;

/** Геометрию из квантованных (meshopt) атрибутов → float32 в нужной системе координат */
function bakeGeometry(src: THREE.BufferGeometry, matrix: THREE.Matrix4, withColor: boolean) {
  const out = new THREE.BufferGeometry();
  const names = withColor ? ["position", "normal", "uv", "color"] : ["position", "normal", "uv"];
  for (const name of names) {
    const a = src.getAttribute(name) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
    if (!a) continue;
    const n = a.itemSize;
    const arr = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) {
      arr[i * n] = a.getX(i);
      if (n > 1) arr[i * n + 1] = a.getY(i);
      if (n > 2) arr[i * n + 2] = a.getZ(i);
      if (n > 3) arr[i * n + 3] = a.getW(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  const count = src.getAttribute("position").count;
  const index = src.index ? Uint32Array.from(src.index.array as ArrayLike<number>) : Uint32Array.from({ length: count }, (_, i) => i);
  // Отражённые узлы (отрицательный масштаб) — разворачиваем порядок вершин, иначе грани вывернутся
  if (matrix.determinant() < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.applyMatrix4(matrix);
  return out;
}

function mergeBucket(geoms: THREE.BufferGeometry[]) {
  if (geoms.length === 1) return geoms[0];
  const names = Object.keys(geoms[0].attributes).filter((n) => geoms.every((g) => g.getAttribute(n)));
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const n = geoms[0].getAttribute(name).itemSize;
    const total = geoms.reduce((s, g) => s + g.getAttribute(name).count * n, 0);
    const arr = new Float32Array(total);
    let off = 0;
    for (const g of geoms) {
      arr.set(g.getAttribute(name).array as Float32Array, off);
      off += g.getAttribute(name).count * n;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  const indexTotal = geoms.reduce((s, g) => s + g.index!.count, 0);
  const index = new Uint32Array(indexTotal);
  let io = 0;
  let vo = 0;
  for (const g of geoms) {
    const src = g.index!.array;
    for (let i = 0; i < src.length; i++) index[io + i] = src[i] + vo;
    io += src.length;
    vo += g.getAttribute("position").count;
    g.dispose();
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

const DEBUG_COLORS = PART_KEYS.reduce(
  (acc, k, i) => ({ ...acc, [k]: new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((i * 0.137) % 1, 0.7, 0.55) }) }),
  {} as Record<PartKey, THREE.MeshStandardMaterial>,
);

function buildCar(scene: THREE.Object3D, lite: boolean, mats: JeskoMaterials, debugParts: boolean) {
  // --- 1. Нормализация: нос в +X, длина MODEL.length, центр в 0, колёса на y = 0 ---
  const clone = scene.clone(true);
  const wrapper = new THREE.Group();
  wrapper.add(clone);
  clone.rotation.y = MODEL.rotationY;
  wrapper.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  wrapper.scale.setScalar(MODEL.length / Math.max(size.x, size.z));
  wrapper.updateMatrixWorld(true);
  box.setFromObject(clone);
  const c = box.getCenter(new THREE.Vector3());
  wrapper.position.set(-c.x, -box.min.y, -c.z);
  wrapper.updateMatrixWorld(true);

  // --- 2. Классификация узлов ---
  const nodes = new Map<THREE.Object3D, THREE.Mesh[]>();
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const node = nodeOf(mesh);
    nodes.set(node, [...(nodes.get(node) ?? []), mesh]);
  });

  type Pending = { part: PartKey; signs: Signs; meshes: THREE.Mesh[]; box: THREE.Box3 };
  // Фары/фонари: светятся, но разлетаются вместе со своей частью кузова
  const lightMeshes = new Set<THREE.Mesh>();
  const pending = new Map<string, Pending>();
  for (const [node, meshes] of nodes) {
    const nb = new THREE.Box3();
    meshes.forEach((m) => nb.expandByObject(m));
    if (nb.isEmpty()) continue;
    const center = nb.getCenter(new THREE.Vector3());
    const info: NodeInfo = {
      name: String(node.userData.name ?? node.name),
      materials: meshes.map((m) => (m.material as THREE.Material).name),
      min: nb.min,
      max: nb.max,
      center,
    };
    const part = classifyNode(info);
    if (isLightNode(info)) meshes.forEach((m) => lightMeshes.add(m));
    const signs = instanceSigns(part, center);
    const id = `${part}|${signs.sx}|${signs.sz}`;
    const p = pending.get(id) ?? { part, signs, meshes: [], box: new THREE.Box3() };
    p.meshes.push(...meshes);
    p.box.union(nb);
    pending.set(id, p);
  }

  // --- 3. Группы деталей, петли дверей, слияние мешей по материалам ---
  const root = new THREE.Group();
  const instances: Instance[] = [];
  const matCache = new Map<string, THREE.Material>();
  const ownMaterials = new Set<THREE.Material>();
  const inv = new THREE.Matrix4();

  for (const [id, p] of pending) {
    const base = p.box.getCenter(new THREE.Vector3());
    const sizeV = p.box.getSize(new THREE.Vector3());
    const group = new THREE.Group();
    group.position.copy(base);
    root.add(group);

    let container: THREE.Group = group;
    let containerWorld = base.clone();
    let door: Instance["door"];
    if (p.part === "door_left" || p.part === "door_right") {
      const out = p.part === "door_left" ? -1 : 1;
      // Петля — у основания передней стойки: передний край двери, низ, по центру толщины
      const hingeWorld = new THREE.Vector3(p.box.max.x - 0.06, p.box.min.y + 0.12, base.z);
      const hinge = new THREE.Group();
      hinge.position.copy(hingeWorld).sub(base);
      group.add(hinge);
      container = hinge;
      containerWorld = hingeWorld;
      door = {
        hinge,
        hingeBase: hinge.position.clone(),
        axis: new THREE.Vector3(...DOOR.axis(out)).normalize(),
        shift: new THREE.Vector3(...DOOR.shift(out)),
      };
    }
    inv.makeTranslation(-containerWorld.x, -containerWorld.y, -containerWorld.z);

    const buckets = new Map<string, { material: THREE.Material; geoms: THREE.BufferGeometry[] }>();
    for (const mesh of p.meshes) {
      const original = mesh.material as THREE.Material;
      const front = mesh.getWorldPosition(new THREE.Vector3()).x > 0;
      const light = lightMeshes.has(mesh);
      const key = `${original.uuid}|${p.part === "brakes"}|${light ? front : ""}|${debugParts ? p.part : ""}`;
      let material = matCache.get(key);
      if (!material) {
        material = debugParts ? DEBUG_COLORS[p.part] : pickMaterial(mats, original, { part: p.part, front, light }) ?? original;
        if (material !== original && material.name === "") material.name = original.name;
        matCache.set(key, material);
        if (!Object.values(mats).includes(material as never) && material !== original && !debugParts) ownMaterials.add(material);
      }
      const withColor = Boolean((material as THREE.MeshStandardMaterial).vertexColors) && !!mesh.geometry.getAttribute("color");
      const matrix = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
      const bucketKey = `${material.uuid}|${withColor}`;
      const b = buckets.get(bucketKey) ?? { material, geoms: [] };
      b.geoms.push(bakeGeometry(mesh.geometry, matrix, withColor));
      buckets.set(bucketKey, b);
    }
    for (const { material, geoms } of buckets.values()) {
      const merged = new THREE.Mesh(mergeBucket(geoms), material);
      merged.geometry.computeBoundingSphere();
      merged.renderOrder = material.transparent ? 1 : 0;
      container.add(merged);
    }

    instances.push({
      id,
      part: p.part,
      signs: p.signs,
      group,
      base,
      size: sizeV,
      phase: (base.x * 7.13 + base.z * 3.7) % (Math.PI * 2),
      active: canExplode(p.part, lite),
      door,
    });
  }

  if (debugParts) {
    // ?debug=parts — сводка по деталям для проверки маппинга
    const summary = instances.map((i) => ({
      id: i.id,
      tris: i.group.children.concat(i.door ? i.door.hinge.children : []).reduce(
        (s, o) => s + ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).geometry.index?.count ?? 0) / 3 : 0),
        0,
      ),
      center: i.base.toArray().map((v) => +v.toFixed(2)),
      size: i.size.toArray().map((v) => +v.toFixed(2)),
    }));
    document.body.dataset.carParts = JSON.stringify(summary);
    console.table(summary);
  }

  // --- 4. Разметка для процедурных деталей (V8, коробка, монокок, подвеска) ---
  const find = (part: PartKey) => instances.find((i) => i.part === part);
  const wheels = (["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"] as const).map((k) => find(k));
  const layout: CarLayout = {
    wheels: wheels.map((w) => (w ? w.base.clone() : null)),
    wheelRadius: wheels[0] ? wheels[0].size.y / 2 : 0.34,
    car: new THREE.Box3().setFromObject(root),
  };

  return { root, instances, layout, ownMaterials };
}

export function GLBCar({ url, lite = false }: { url: string; lite?: boolean }) {
  const setModelProgress = useAppStore((s) => s.setModelProgress);
  const gltf = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      (loader as GLTFLoader).setMeshoptDecoder(MeshoptDecoder);
    },
    (e) => {
      // Реальный прогресс по байтам: размер файла вшит в сборку (next.config → env),
      // запасной вариант — Content-Length из ответа
      const total = (url === MODEL.mobileUrl ? MODEL_SIZE.mobile : MODEL_SIZE.desktop) || e.total;
      if (total) setModelProgress(Math.min(1, e.loaded / total));
    },
  );
  const mats = useMemo(() => createJeskoMaterials(lite), [lite]);
  const debugParts = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "parts";

  const car = useMemo(() => buildCar(gltf.scene, lite, mats, debugParts), [gltf.scene, lite, mats, debugParts]);

  useEffect(() => {
    setModelProgress(1);
    return () => {
      car.root.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.dispose());
      car.ownMaterials.forEach((m) => m.dispose());
    };
  }, [car, setModelProgress]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Двери: плавный старт/стоп
    const d = pose.doors * pose.doors * (3 - 2 * pose.doors);
    for (const inst of car.instances) {
      applyExplode(inst.group, inst.base, inst.part, inst.signs, inst.active, t, inst.phase, inst.id);
      if (inst.door) {
        const { hinge, hingeBase, axis, shift } = inst.door;
        hinge.quaternion.setFromAxisAngle(axis, DOOR.angle * d);
        hinge.position.copy(hingeBase).addScaledVector(shift, d);
      }
    }
    updateJeskoLights(mats, pose.lights);
  });

  // Режим осмотра: каждая группа — «кусок» (затухание), осматриваемые — ещё и с хит-боксом.
  // Хит-бокс двигателя ставит JeskoInternals — по габариту V8, а не всего моторного отсека.
  useEffect(() => {
    const offs: (() => void)[] = [];
    for (const inst of car.instances) {
      offs.push(registerPiece(inst.id, inst.group));
      const id = inspectGroupOf(inst.part);
      if (!id || !inst.active || inst.part === "engine") continue;
      // У дверей контент висит на петле — хит-бокс туда же, чтобы открывался вместе с дверью
      const parent = inst.door ? inst.door.hinge : inst.group;
      const center = inst.door ? inst.door.hingeBase.clone().negate() : new THREE.Vector3();
      const hitbox = createHitbox(new THREE.Box3().setFromCenterAndSize(center, inst.size));
      parent.add(hitbox);
      const off = registerTarget({ id, key: inst.id, piece: inst.group, hitbox });
      offs.push(() => {
        off();
        parent.remove(hitbox);
        hitbox.geometry.dispose();
      });
    }
    return () => offs.forEach((f) => f());
  }, [car]);

  const engineInstance = car.instances.find((i) => i.part === "engine");
  const engine = engineInstance ? { group: engineInstance.group, base: engineInstance.base, key: engineInstance.id } : null;

  return (
    <>
      <primitive object={car.root} />
      <JeskoInternals layout={car.layout} lite={lite} mats={mats} engine={engine} />
    </>
  );
}
