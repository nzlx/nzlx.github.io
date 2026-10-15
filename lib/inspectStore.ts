/**
 * Режим осмотра — лёгкая часть без three.js (для курсора, панели и UI вне 3D-чанка).
 * Тяжёлая часть (хит-боксы, затухание, состояние кадра) — lib/inspect.ts.
 */
import type * as THREE from "three";
import { create } from "zustand";
import { INSPECT_GROUPS, type InspectId } from "./carParts";

export type Target = { id: InspectId; key: string; piece: THREE.Object3D; hitbox: THREE.Mesh };

/** Все группы деталей на сцене (для затухания и отъезда в режиме осмотра) */
export const pieces = new Map<string, THREE.Object3D>();
/** Осматриваемые детали: ключ куска → цель */
export const targets = new Map<string, Target>();
/** Точка, к которой ведётся линия подписи группы */
export const labelAnchors = new Map<InspectId, THREE.Object3D>();

/** Группы, которые реально есть на сцене (на мобильных часть деталей не разбирается) */
export const availableIds = () => INSPECT_GROUPS.map((g) => g.id).filter((id) => [...targets.values()].some((t) => t.id === id));

/** Панель описания: ширина справа на десктопе, доля высоты bottom sheet на мобильных */
export const INSPECT_PANEL = { width: 420, sheet: 0.46 };

/** Камера ещё в режиме осмотра (в том числе во время возврата) — выставляет Inspector */
export const inspectFlags = { busy: false };
export const isInspecting = () => inspectFlags.busy || useInspect.getState().selected !== null;

type InspectState = {
  hovered: InspectId | null;
  hoveredKey: string | null;
  /** Меши под курсором — для контура (Outline) */
  outline: THREE.Object3D[];
  selected: InspectId | null;
  /** Конкретный экземпляр (например, кликнутое колесо); null — ближайший к камере */
  selectedKey: string | null;
  setHover: (id: InspectId | null, key?: string | null, outline?: THREE.Object3D[]) => void;
  open: (id: InspectId, key?: string | null) => void;
  step: (dir: 1 | -1) => void;
  close: () => void;
};

export const useInspect = create<InspectState>((set, get) => ({
  hovered: null,
  hoveredKey: null,
  outline: [],
  selected: null,
  selectedKey: null,
  setHover: (id, key = null, outline = []) => {
    if (get().hovered === id && get().hoveredKey === key) return;
    set({ hovered: id, hoveredKey: key, outline });
  },
  open: (id, key = null) => set({ selected: id, selectedKey: key, hovered: null, hoveredKey: null, outline: [] }),
  step: (dir) => {
    const ids = availableIds();
    const cur = get().selected;
    if (!cur || ids.length === 0) return;
    const i = ids.indexOf(cur);
    set({ selected: ids[(i + dir + ids.length) % ids.length], selectedKey: null });
  },
  close: () => set({ selected: null, selectedKey: null }),
}));
