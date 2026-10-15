"use client";

import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { content } from "@/data/content";
import type { InspectId } from "@/lib/carParts";
import { pose } from "@/lib/scrollStages";
import { inspectRT, interactiveRT, labelAnchors, meshesOf, pieces, targets, useInspect } from "@/lib/inspect";

/**
 * Подписи деталей в разобранном виде.
 * PartLabelsLayer — DOM-слой поверх страницы (кнопки + линии-указатели в SVG).
 * LabelLayout — внутри Canvas: каждый кадр раскладывает подписи колонками слева и справа
 * от машины, без пересечений, в безопасной зоне (ниже шапки и заголовка секции, выше списка).
 */

type LabelDom = { el: HTMLButtonElement; line: SVGPolylineElement; dot: SVGCircleElement };
const labelDom = new Map<InspectId, Partial<LabelDom>>();
const setDom = (id: InspectId, patch: Partial<LabelDom>) => labelDom.set(id, { ...labelDom.get(id), ...patch });

/** Экземпляр, к которому привязана подпись группы */
const labelTarget = (id: InspectId) => {
  const anchor = labelAnchors.get(id);
  return [...targets.values()].find((t) => t.hitbox === anchor) ?? null;
};

export function PartLabelsLayer() {
  const hovered = useInspect((s) => s.hovered);
  const setHover = useInspect((s) => s.setHover);
  const open = useInspect((s) => s.open);

  return (
    <div className="labels-layer">
      <svg className="labels-layer__lines" aria-hidden>
        {content.parts.map((p) => (
          <g key={p.id} className={hovered === p.id ? "is-active" : undefined}>
            <polyline ref={(n) => void (n && setDom(p.id, { line: n }))} opacity="0" />
            <circle ref={(n) => void (n && setDom(p.id, { dot: n }))} r="4" opacity="0" />
          </g>
        ))}
      </svg>
      {content.parts.map((p) => (
        <button
          key={p.id}
          ref={(n) => void (n && setDom(p.id, { el: n }))}
          type="button"
          className={`part-label ${hovered === p.id ? "is-active" : ""}`}
          style={{ opacity: 0, pointerEvents: "none" }}
          data-cursor={content.inspect.cursor}
          data-cursor-icon="zoom"
          onPointerEnter={() => {
            const t = labelTarget(p.id);
            setHover(p.id, t?.key ?? null, t ? meshesOf(t.piece) : []);
          }}
          onPointerLeave={() => setHover(null)}
          onClick={() => open(p.id, labelTarget(p.id)?.key ?? null)}
        >
          <span className="part-label__title">{p.title}</span>
          <span className="part-label__spec">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

const GAP = 12;
const COLUMN_OFFSET = 36;
/** Справа — индикатор прогресса */
const RIGHT_RESERVE = 110;
const v = new THREE.Vector3();
const box = new THREE.Box3();

/** Экранный габарит машины в разобранном виде — по всем деталям, а не по точкам подписей */
function silhouette(camera: THREE.Camera, W: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const piece of pieces.values()) {
    if (!piece.visible) continue;
    box.setFromObject(piece);
    if (box.isEmpty()) continue;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * W;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return { minX, maxX };
}

type Item = { id: InspectId; dom: LabelDom; ax: number; ay: number; w: number; h: number; y: number; i: number };

/** Раскладывает колонку: желаемая высота — у точки детали, без наложений, внутри [top, bottom] */
function stack(items: Item[], top: number, bottom: number) {
  items.sort((a, b) => a.ay - b.ay);
  const total = items.reduce((s, it) => s + it.h, 0);
  const gap = Math.max(4, Math.min(GAP, (bottom - top - total) / Math.max(1, items.length - 1)));
  let cursor = top;
  for (const it of items) {
    it.y = Math.max(it.ay - it.h / 2, cursor);
    cursor = it.y + it.h + gap;
  }
  // Если вылезли за низ — поднимаем снизу вверх
  let limit = bottom;
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    it.y = Math.min(it.y, limit - it.h);
    limit = it.y - gap;
  }
  for (const it of items) it.y = Math.max(it.y, top);
}

export function LabelLayout() {
  const { camera, size } = useThree();

  useFrame(() => {
    const W = size.width;
    const H = size.height;
    const vis = pose.labels * (1 - inspectRT.amount);
    const hideAll = W < 768 || vis < 0.01;

    // Безопасная зона: ниже шапки и заголовка секции, выше списка деталей
    const head = document.querySelector(".anatomy-head")?.getBoundingClientRect();
    const list = document.querySelector(".anatomy-list")?.getBoundingClientRect();
    const top = 96;
    const bottom = list && list.top < H ? list.top - 20 : H - 24;
    const leftTop = head && head.bottom > 0 ? Math.max(top, head.bottom + 24) : top;

    const items: Item[] = [];
    content.parts.forEach((p, i) => {
      const dom = labelDom.get(p.id);
      const anchor = labelAnchors.get(p.id);
      if (!dom?.el || !dom.line || !dom.dot) return;
      if (hideAll || !anchor) {
        dom.el.style.opacity = "0";
        dom.el.style.pointerEvents = "none";
        dom.line.setAttribute("opacity", "0");
        dom.dot.setAttribute("opacity", "0");
        return;
      }
      anchor.getWorldPosition(v).project(camera);
      if (v.z > 1) return;
      items.push({
        id: p.id,
        dom: dom as LabelDom,
        ax: (v.x * 0.5 + 0.5) * W,
        ay: (-v.y * 0.5 + 0.5) * H,
        w: dom.el.offsetWidth,
        h: dom.el.offsetHeight,
        y: 0,
        i,
      });
    });
    if (items.length === 0) return;

    // Колонки снаружи силуэта: делим подписи по центру машины, выравниваем количество
    const sil = silhouette(camera, W);
    const minX = Number.isFinite(sil.minX) ? sil.minX : Math.min(...items.map((it) => it.ax));
    const maxX = Number.isFinite(sil.maxX) ? sil.maxX : Math.max(...items.map((it) => it.ax));
    const mid = (minX + maxX) / 2;
    const left = items.filter((it) => it.ax < mid);
    const right = items.filter((it) => it.ax >= mid);
    const cap = Math.ceil(items.length / 2) + 1;
    while (left.length > cap) right.push(left.splice(left.indexOf(left.reduce((a, b) => (a.ax > b.ax ? a : b))), 1)[0]);
    while (right.length > cap) left.push(right.splice(right.indexOf(right.reduce((a, b) => (a.ax < b.ax ? a : b))), 1)[0]);

    const maxW = Math.max(...items.map((it) => it.w));
    // Левее — отступ страницы, правее — индикатор прогресса
    const leftEdge = Math.max(24 + maxW, Math.min(minX - COLUMN_OFFSET, W / 2 - 40));
    const rightEdge = Math.min(W - RIGHT_RESERVE - maxW, Math.max(maxX + COLUMN_OFFSET, W / 2 + 40));
    stack(left, leftTop, bottom);
    stack(right, top, bottom);

    const interactive = interactiveRT.enabled;
    const place = (it: Item, side: "left" | "right") => {
      const x = side === "left" ? leftEdge - it.w : rightEdge;
      const o = Math.min(1, Math.max(0, vis * 1.6 - it.i * 0.06));
      const { el, line, dot } = it.dom;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
      el.style.opacity = o.toFixed(3);
      el.style.pointerEvents = interactive && o > 0.6 ? "auto" : "none";
      el.dataset.side = side;
      // Линия: от края подписи → короткий горизонтальный участок → к точке на детали
      const ey = it.y + it.h / 2;
      const ex = side === "left" ? leftEdge : rightEdge;
      const elbow = side === "left" ? ex + 20 : ex - 20;
      line.setAttribute("points", `${ex},${ey} ${elbow},${ey} ${it.ax.toFixed(1)},${it.ay.toFixed(1)}`);
      line.setAttribute("opacity", (o * 0.7).toFixed(3));
      dot.setAttribute("cx", it.ax.toFixed(1));
      dot.setAttribute("cy", it.ay.toFixed(1));
      dot.setAttribute("opacity", o.toFixed(3));
    };
    left.forEach((it) => place(it, "left"));
    right.forEach((it) => place(it, "right"));
  });

  return null;
}
