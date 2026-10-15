import * as THREE from "three";
import type { PartKey } from "@/lib/carParts";

export const LIME = "#c8ff00";

/** Повторяющаяся текстура карбонового плетения (twill 2×2) для процедурных деталей */
function createCarbonTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cell = size / 4;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const vertical = (x + y) % 4 < 2;
      const g = ctx.createLinearGradient(x * cell, y * cell, vertical ? x * cell + cell : x * cell, vertical ? y * cell : y * cell + cell);
      g.addColorStop(0, vertical ? "#2b2c30" : "#151618");
      g.addColorStop(0.5, vertical ? "#3a3c41" : "#1e1f22");
      g.addColorStop(1, vertical ? "#2b2c30" : "#151618");
      ctx.fillStyle = g;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export type JeskoMaterials = ReturnType<typeof createJeskoMaterials>;

/** lite — мобильный режим: без иридесценции и прозрачности с преломлением */
export function createJeskoMaterials(lite: boolean) {
  const carbonMap = createCarbonTexture();
  return {
    /** Перламутровый белый */
    pearl: new THREE.MeshPhysicalMaterial({
      color: "#f2f1ec",
      metalness: 0.12,
      roughness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      ...(lite ? {} : { iridescence: 0.35, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 480] as [number, number] }),
    }),
    /** Чёрный глянцевый карбон (карта плетения берётся из модели) */
    carbon: new THREE.MeshPhysicalMaterial({
      color: "#3a3b40",
      metalness: 0.25,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    /** Карбон для процедурных деталей — со своей текстурой */
    carbonProc: new THREE.MeshPhysicalMaterial({
      map: carbonMap,
      metalness: 0.2,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    lime: new THREE.MeshStandardMaterial({
      color: LIME,
      emissive: LIME,
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.35,
    }),
    rim: new THREE.MeshStandardMaterial({ color: "#2a2b2f", metalness: 0.85, roughness: 0.28 }),
    satin: new THREE.MeshStandardMaterial({ color: "#1a1a1d", metalness: 0.2, roughness: 0.6 }),
    titanium: new THREE.MeshStandardMaterial({ color: "#7c7a78", metalness: 0.95, roughness: 0.32 }),
    metal: new THREE.MeshStandardMaterial({ color: "#45474d", metalness: 0.85, roughness: 0.38 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#e8e9ec", metalness: 1, roughness: 0.08 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#0d1116",
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: lite ? 0.55 : 0.42,
      clearcoat: 1,
      depthWrite: false,
    }),
    /** Прозрачные рассеиватели фар — под ними видно свечение */
    lens: new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: 0.02,
      transparent: true,
      opacity: 0.12,
      clearcoat: 1,
      depthWrite: false,
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#eaf2ff",
      emissiveIntensity: 0.3,
      toneMapped: false,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: "#2a0004",
      emissive: "#ff1f2d",
      emissiveIntensity: 0.4,
      toneMapped: false,
    }),
  };
}

/** Фары гаснут/включаются: lights 0..1 (финальная секция). Значения > 1 ловит bloom. */
export function updateJeskoLights(m: JeskoMaterials, lights: number) {
  m.headlight.emissiveIntensity = 0.3 + lights * 7;
  m.taillight.emissiveIntensity = 0.4 + lights * 2.6;
}

type Pick = { part: PartKey; front: boolean; light: boolean };

/**
 * Замена материалов модели по имени. Возвращает null — оставить материал модели.
 * Имена материалов см. в отчёте инспекции (Material.006 — краска, .001 — карбон и т.д.).
 */
export function pickMaterial(
  m: JeskoMaterials,
  original: THREE.Material,
  { part, front, light }: Pick,
): THREE.Material | null {
  const name = original.name;
  const isGlass = /^Material\.(005|010)$/.test(name);

  if (light) return isGlass ? m.lens : front ? m.headlight : m.taillight;
  if (/^(MI_Light|MI_Glass_Light)/.test(name)) return front ? m.headlight : m.taillight;
  if (isGlass) return m.glass;
  // Суппорты покрашены краской кузова — делаем их салатовыми
  if (name === "Material.006") return part === "brakes" ? m.lime : m.pearl;
  if (name === "Material.001") {
    const carbon = m.carbon.clone();
    carbon.map = (original as THREE.MeshStandardMaterial).map ?? null;
    return carbon;
  }
  // В оригинале золотая окантовка капота и полосы — у нас салатовые
  if (name === "Material.011") return m.lime;
  if (name === "Material.058") return m.rim;
  if (/^MI_Exhaust/.test(name)) return m.titanium;
  if (/^MI_Engine/.test(name)) return m.metal;
  if (/^MI_Mirror/.test(name)) return m.chrome;
  if (/^MI_Logo/.test(name)) return m.chrome;
  if (/^MI_/.test(name)) return m.satin;
  return null;
}
