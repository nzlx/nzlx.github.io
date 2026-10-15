import * as THREE from "three";

export const PAINT_COLOR = "#f2f1ec";
export const DETAIL_COLOR = "#c8ff00";

export type CarMaterials = ReturnType<typeof createCarMaterials>;

/** lite = мобильный режим: без transmission (дорогой дополнительный проход рендера) */
export function createCarMaterials(lite: boolean) {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: PAINT_COLOR,
      metalness: 0.45,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
    trim: new THREE.MeshStandardMaterial({ color: "#121214", metalness: 0.4, roughness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#0e0e0f", roughness: 0.92 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#e6e7eb", metalness: 1, roughness: 0.14 }),
    metal: new THREE.MeshStandardMaterial({ color: "#5c5f66", metalness: 0.85, roughness: 0.35 }),
    leather: new THREE.MeshStandardMaterial({ color: "#1b1b1e", roughness: 0.75 }),
    detail: new THREE.MeshStandardMaterial({ color: DETAIL_COLOR, metalness: 0.3, roughness: 0.35 }),
    glass: lite
      ? new THREE.MeshStandardMaterial({
          color: "#8fa6bf",
          metalness: 0.1,
          roughness: 0.05,
          transparent: true,
          opacity: 0.35,
        })
      : new THREE.MeshPhysicalMaterial({
          color: "#cfdbe8",
          metalness: 0,
          roughness: 0.03,
          transmission: 1,
          thickness: 0.05,
          ior: 1.45,
        }),
    headlight: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#e4ecff",
      emissiveIntensity: 0.5,
      toneMapped: false,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: "#2a0000",
      emissive: "#ff1f2d",
      emissiveIntensity: 0.5,
      toneMapped: false,
    }),
  };
}

/** Яркость фар: 0 — дежурный свет, 1 — включены (секция «Контакты»). Значения > 1 ловит bloom. */
export function updateLights(m: Pick<CarMaterials, "headlight" | "taillight">, lights: number) {
  m.headlight.emissiveIntensity = 0.5 + lights * 2.5;
  m.taillight.emissiveIntensity = 0.5 + lights * 2;
}
