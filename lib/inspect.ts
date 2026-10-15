/**
 * Режим осмотра деталей (секция «Устройство») — часть, которой нужен three.js.
 *
 * - Регистрация: каждая группа детали («кусок» — piece) попадает в реестр;
 *   осматриваемые — ещё и с невидимым хит-боксом (raycast только по ним, не по 400+ мешам).
 * - inspectRT — изменяемое состояние для кадра (без ре-рендеров React).
 * Состояние интерфейса и реестр — lib/inspectStore.ts (без three, для UI вне 3D-чанка).
 */
import * as THREE from "three";
import { INSPECT_GROUPS, type InspectId } from "./carParts";
import { labelAnchors, pieces, targets, type Target } from "./inspectStore";

export * from "./inspectStore";

/* ------------------------------ реестр ------------------------------ */

const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

/** Невидимый хит-бокс по габариту (в локальных координатах родителя) */
export function createHitbox(box: THREE.Box3) {
  const size = box.getSize(new THREE.Vector3());
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitboxMaterial);
  box.getCenter(mesh.position);
  mesh.userData.hitbox = true;
  return mesh;
}

/** Габарит объекта в его собственных координатах (без учёта вращения родителей) */
export function localBox(obj: THREE.Object3D) {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  return box.applyMatrix4(new THREE.Matrix4().copy(obj.matrixWorld).invert());
}

export function registerPiece(key: string, piece: THREE.Object3D) {
  pieces.set(key, piece);
  return () => {
    if (pieces.get(key) === piece) pieces.delete(key);
  };
}

export function registerTarget(t: Target) {
  targets.set(t.key, t);
  const group = INSPECT_GROUPS.find((g) => g.id === t.id);
  const labelOn = group && "labelOn" in group ? group.labelOn : undefined;
  if (!labelAnchors.has(t.id) || (labelOn && t.key.startsWith(labelOn))) labelAnchors.set(t.id, t.hitbox);
  return () => {
    if (targets.get(t.key) === t) targets.delete(t.key);
    if (labelAnchors.get(t.id) === t.hitbox) labelAnchors.delete(t.id);
  };
}

export const hitboxes = () => [...targets.values()].map((t) => t.hitbox);

/** Экземпляр группы, ближайший к камере (для «Предыдущая/Следующая» и кликов по подписи) */
export function nearestTarget(id: InspectId, camera: THREE.Camera) {
  let best: Target | null = null;
  let bestD = Infinity;
  const p = new THREE.Vector3();
  for (const t of targets.values()) {
    if (t.id !== id) continue;
    const d = t.hitbox.getWorldPosition(p).distanceToSquared(camera.position);
    if (d < bestD) [best, bestD] = [t, d];
  }
  return best;
}

/** Меши куска без хит-боксов — для контура подсветки */
export function meshesOf(obj: THREE.Object3D) {
  const out: THREE.Mesh[] = [];
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.hitbox) out.push(m);
  });
  return out;
}

/* ----------------------- состояние для кадра ------------------------ */

export const inspectRT = {
  /** 0 — камера скролла, 1 — камера осмотра (твинится GSAP) */
  k: 0,
  /** Сила эффектов осмотра: затухание и отъезд остальных, выдвижение выбранной */
  amount: 0,
  camPos: new THREE.Vector3(),
  camTarget: new THREE.Vector3(),
  /** Управление у OrbitControls — CarRig камеру не трогает */
  controls: false,
  /** Сдвиг кадра под панель (px): x — десктоп, y — мобильный bottom sheet */
  shiftX: 0,
  shiftY: 0,
  selectedKey: null as string | null,
  /** Положение выбранной детали (в координатах машины) — от неё «отъезжают» остальные */
  selectedPos: new THREE.Vector3(),
  /** Камера в координатах машины — к ней выдвигается выбранная деталь */
  camLocal: new THREE.Vector3(),
  /** Медленное вращение выбранной детали */
  spin: 0,
};

/** Детали кликабельны только в разобранном виде, пока на экране секция «Устройство» */
export const interactiveRT = { enabled: false };

/* ------------------------- затухание деталей ------------------------ */

const GHOST_OPACITY = 0.08;

/**
 * Прозрачность куска: 0 — как есть, 1 — почти невидим. Материалы клонируются лениво
 * (общие материалы машины не трогаем) и возвращаются, когда кусок снова непрозрачен.
 */
export function setGhost(obj: THREE.Object3D, level: number) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.hitbox) return;
    const orig = mesh.userData.ghostOrig as THREE.Material | undefined;
    if (level <= 0.001) {
      if (orig) {
        (mesh.material as THREE.Material).dispose();
        mesh.material = orig;
        delete mesh.userData.ghostOrig;
      }
      return;
    }
    if (!orig) {
      const base = mesh.material as THREE.Material;
      mesh.userData.ghostOrig = base;
      const clone = base.clone();
      clone.transparent = true;
      clone.userData.baseOpacity = base.opacity;
      mesh.material = clone;
    }
    const m = mesh.material as THREE.Material;
    m.opacity = THREE.MathUtils.lerp(m.userData.baseOpacity ?? 1, GHOST_OPACITY, level);
    m.depthWrite = level < 0.5;
  });
}
