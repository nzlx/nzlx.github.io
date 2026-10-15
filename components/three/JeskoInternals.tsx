"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { pose } from "@/lib/scrollStages";
import { createHitbox, localBox, registerTarget } from "@/lib/inspect";
import { ExplodingGroup } from "./explode";
import type { JeskoMaterials } from "./jeskoMaterials";

/**
 * Внутренние детали, которых нет в модели, — в стилизованном «техническом» виде
 * (металл + карбон + салатовые акценты). Размеры и положение берутся из реальной
 * разметки модели — осей колёс.
 */

export type CarLayout = {
  /** Центры колёс: [fl, fr, rl, rr] */
  wheels: (THREE.Vector3 | null)[];
  wheelRadius: number;
  car: THREE.Box3;
};

type Vec3 = [number, number, number];
type M = { mats: JeskoMaterials; seg: number };

/** Цилиндр-тяга между двумя точками */
function Rod({ from, to, r, material, seg = 8 }: { from: Vec3; to: Vec3; r: number; material: THREE.Material; seg?: number }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[r, r, length, seg]} />
    </mesh>
  );
}

/** Амортизатор с пружиной между двумя точками */
function Shock({ from, to, mats, seg }: { from: Vec3; to: Vec3 } & M) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  const coils = 7;
  return (
    <group position={position} quaternion={quaternion}>
      <mesh material={mats.titanium}>
        <cylinderGeometry args={[0.022, 0.022, length, seg]} />
      </mesh>
      <mesh position={[0, -length * 0.18, 0]} material={mats.metal}>
        <cylinderGeometry args={[0.035, 0.035, length * 0.5, seg]} />
      </mesh>
      {Array.from({ length: coils }, (_, i) => (
        <mesh key={i} position={[0, -length * 0.3 + (i / (coils - 1)) * length * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.lime}>
          <torusGeometry args={[0.055, 0.009, 6, seg + 4]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ V8 ------------------------------ */

function V8({ mats, seg }: M) {
  const L = 0.62;
  return (
    <group>
      {/* Блок цилиндров и картер */}
      <RoundedBox args={[L, 0.2, 0.3]} radius={0.03} smoothness={2} material={mats.metal} />
      <RoundedBox args={[L * 0.9, 0.08, 0.26]} radius={0.02} smoothness={2} position={[0, -0.13, 0]} material={mats.satin} />
      {/* Две головки блока в развал */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0.15, s * 0.14]} rotation={[s * 0.55, 0, 0]}>
          <RoundedBox args={[L * 0.96, 0.09, 0.2]} radius={0.025} smoothness={2} material={mats.carbonProc} />
          <mesh position={[0, 0.047, 0]} material={mats.lime}>
            <boxGeometry args={[L * 0.86, 0.006, 0.035]} />
          </mesh>
          {/* Свечные катушки */}
          {[-0.21, -0.07, 0.07, 0.21].map((x) => (
            <mesh key={x} position={[x, 0.06, 0]} material={mats.satin}>
              <cylinderGeometry args={[0.018, 0.018, 0.04, seg]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Впускной ресивер и патрубки */}
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.carbonProc}>
        <cylinderGeometry args={[0.06, 0.06, L * 0.85, seg * 2]} />
      </mesh>
      {[-0.21, -0.07, 0.07, 0.21].flatMap((x) =>
        [-1, 1].map((s) => (
          <Rod key={`${x}${s}`} from={[x, 0.26, s * 0.03]} to={[x, 0.2, s * 0.12]} r={0.016} material={mats.titanium} seg={seg} />
        )),
      )}
      {/* Две турбины позади блока */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-L / 2 - 0.08, 0.06, s * 0.17]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={mats.titanium}>
            <torusGeometry args={[0.065, 0.035, 10, seg * 2]} />
          </mesh>
          <mesh material={mats.metal}>
            <cylinderGeometry args={[0.045, 0.045, 0.1, seg * 2]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} material={mats.lime}>
            <cylinderGeometry args={[0.03, 0.03, 0.025, seg * 2]} />
          </mesh>
        </group>
      ))}
      {/* Выхлопной коллектор и трубы к центральному выходу */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Rod from={[0.2, -0.02, s * 0.2]} to={[-L / 2 - 0.05, 0.04, s * 0.2]} r={0.022} material={mats.titanium} seg={seg} />
          <Rod from={[-L / 2 - 0.12, 0.04, s * 0.17]} to={[-L / 2 - 0.42, 0.08, s * 0.05]} r={0.03} material={mats.titanium} seg={seg} />
        </group>
      ))}
    </group>
  );
}

/**
 * V8 прячется внутри кузова и становится видимым с началом разборки.
 * Хит-бокс осмотра — по габариту V8; выбирается при этом весь моторный отсек (piece).
 */
function HiddenUntilExplode({
  children,
  position,
  piece,
}: {
  children: React.ReactNode;
  position: Vec3;
  piece: { key: string; group: THREE.Group };
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = pose.explode > 0.12;
  });
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const hitbox = createHitbox(localBox(g));
    g.add(hitbox);
    const off = registerTarget({ id: "engine", key: piece.key, piece: piece.group, hitbox });
    return () => {
      off();
      g.remove(hitbox);
      hitbox.geometry.dispose();
    };
  }, [piece.key, piece.group]);
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

/* ------------------------- Коробка LST -------------------------- */

function LightSpeedTransmission({ mats, seg }: M) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh material={mats.metal}>
        <cylinderGeometry args={[0.15, 0.13, 0.42, seg * 2]} />
      </mesh>
      {[-0.15, -0.05, 0.05, 0.15].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.satin}>
          <torusGeometry args={[0.145, 0.01, 6, seg * 2]} />
        </mesh>
      ))}
      <mesh position={[0, 0.22, 0]} material={mats.carbonProc}>
        <cylinderGeometry args={[0.12, 0.15, 0.04, seg * 2]} />
      </mesh>
      <mesh position={[0, -0.22, 0]} material={mats.lime}>
        <cylinderGeometry args={[0.13, 0.13, 0.02, seg * 2]} />
      </mesh>
      {/* Приводные валы к колёсам */}
      {[-1, 1].map((s) => (
        <Rod key={s} from={[0, 0.02, s * 0.13]} to={[0, 0.02, s * 0.45]} r={0.022} material={mats.titanium} seg={seg} />
      ))}
    </group>
  );
}

/* --------------------------- Монокок ---------------------------- */

function Monocoque({ length, width, height, mats }: { length: number; width: number; height: number } & M) {
  const geometry = useMemo(() => {
    // «Ванна» монокока: скруглённый контур со стенкой, выдавленный вверх
    const rr = (w: number, l: number, r: number) => {
      const s = new THREE.Shape();
      s.moveTo(-l / 2 + r, -w / 2);
      s.lineTo(l / 2 - r, -w / 2);
      s.quadraticCurveTo(l / 2, -w / 2, l / 2, -w / 2 + r);
      s.lineTo(l / 2, w / 2 - r);
      s.quadraticCurveTo(l / 2, w / 2, l / 2 - r, w / 2);
      s.lineTo(-l / 2 + r, w / 2);
      s.quadraticCurveTo(-l / 2, w / 2, -l / 2, w / 2 - r);
      s.lineTo(-l / 2, -w / 2 + r);
      s.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + r, -w / 2);
      return s;
    };
    const outer = rr(width, length, 0.28);
    outer.holes.push(rr(width - 0.12, length - 0.12, 0.22));
    const g = new THREE.ExtrudeGeometry(outer, { depth: height, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [length, width, height]);

  return (
    <group>
      <mesh geometry={geometry} material={mats.carbonProc} />
      {/* Пол капсулы */}
      <RoundedBox args={[length - 0.05, 0.04, width - 0.05]} radius={0.015} smoothness={2} position={[0, 0.02, 0]} material={mats.carbonProc} />
      {/* Салатовая окантовка по верхнему краю */}
      <mesh position={[0, height + 0.02, -width / 2 + 0.03]} material={mats.lime}>
        <boxGeometry args={[length * 0.8, 0.008, 0.012]} />
      </mesh>
      <mesh position={[0, height + 0.02, width / 2 - 0.03]} material={mats.lime}>
        <boxGeometry args={[length * 0.8, 0.008, 0.012]} />
      </mesh>
    </group>
  );
}

/* --------------------------- Подвеска --------------------------- */

function Corner({ wheel, mats, seg }: { wheel: THREE.Vector3 } & M) {
  const sz = Math.sign(wheel.z);
  // Все точки — относительно центра колеса
  const hub = -sz * 0.16;
  const inner = -sz * (Math.abs(wheel.z) - 0.33);
  return (
    <group>
      {/* Верхний и нижний A-рычаги */}
      {[
        [0.11, 0.14, 0.12],
        [-0.12, 0.2, 0.17],
      ].map(([y, spread, iy], i) => (
        <group key={i}>
          <Rod from={[0, y, hub]} to={[spread, iy, inner]} r={0.014} material={mats.carbonProc} seg={seg} />
          <Rod from={[0, y, hub]} to={[-spread, iy, inner]} r={0.014} material={mats.carbonProc} seg={seg} />
        </group>
      ))}
      {/* Поворотный кулак */}
      <RoundedBox args={[0.06, 0.26, 0.05]} radius={0.015} smoothness={2} position={[0, 0, hub]} material={mats.metal} />
      {/* Амортизатор */}
      <Shock from={[0.02, -0.08, hub - sz * 0.05]} to={[0.04, 0.34, inner + sz * 0.05]} mats={mats} seg={seg} />
    </group>
  );
}

/* ---------------------------------------------------------------- */

type Props = {
  layout: CarLayout;
  lite: boolean;
  mats: JeskoMaterials;
  /** Группа моторного отсека модели — процедурный V8 крепится к ней и разлетается вместе */
  engine: { group: THREE.Group; base: THREE.Vector3; key: string } | null;
};

export function JeskoInternals({ layout, lite, mats, engine }: Props) {
  const seg = lite ? 8 : 16;
  const r = layout.wheelRadius;
  const [fl, fr, rl, rr] = layout.wheels;
  const frontX = fl && fr ? (fl.x + fr.x) / 2 : layout.car.max.x * 0.62;
  const rearX = rl && rr ? (rl.x + rr.x) / 2 : layout.car.min.x * 0.62;

  // Габариты салона и моторного отсека в модели «размазаны» длинными мешами,
  // поэтому опираемся на оси колёс: Jesko — среднемоторный, база ≈ 2.7 м.
  const wheelbase = frontX - rearX;
  // V8 — между салоном и задней осью, низко; коробка — за двигателем у задней оси
  const v8World: Vec3 = [rearX + wheelbase * 0.25, r + 0.1, 0];
  const gearbox: Vec3 = [rearX - 0.05, r + 0.04, 0];
  // Монокок — от передней оси до перегородки моторного отсека
  const tubFront = frontX - wheelbase * 0.1;
  const tubRear = rearX + wheelbase * 0.4;
  const track = Math.abs(fl?.z ?? 0.8);
  const tub = {
    position: [(tubFront + tubRear) / 2, 0.12, 0] as Vec3,
    length: tubFront - tubRear,
    width: (track - 0.14) * 2,
  };

  const v8 = <V8 mats={mats} seg={seg} />;

  return (
    <>
      {engine ? (
        createPortal(
          <HiddenUntilExplode
            piece={engine}
            position={[v8World[0] - engine.base.x, v8World[1] - engine.base.y, v8World[2] - engine.base.z]}
          >
            {v8}
          </HiddenUntilExplode>,
          engine.group,
        )
      ) : (
        <ExplodingGroup part="engine" position={v8World} lite={lite} inspect="engine" hiddenWhenAssembled>
          {v8}
        </ExplodingGroup>
      )}

      {!lite && (
        <>
          <ExplodingGroup part="gearbox" position={gearbox} lite={lite} inspect="gearbox" hiddenWhenAssembled>
            <LightSpeedTransmission mats={mats} seg={seg} />
          </ExplodingGroup>

          <ExplodingGroup part="monocoque" position={tub.position} lite={lite} inspect="monocoque" hiddenWhenAssembled>
            <Monocoque length={tub.length} width={tub.width} height={0.36} mats={mats} seg={seg} />
          </ExplodingGroup>

          {layout.wheels.map((w, i) =>
            w ? (
              <ExplodingGroup
                key={i}
                part="suspension"
                signs={{ sx: Math.sign(w.x), sz: Math.sign(w.z) }}
                position={[w.x, w.y, w.z]}
                lite={lite}
                inspect="suspension"
                hiddenWhenAssembled
              >
                <Corner wheel={w} mats={mats} seg={seg} />
              </ExplodingGroup>
            ) : null,
          )}

          {/* Горизонтальный амортизатор Triplex между задними колёсами */}
          <ExplodingGroup part="suspension" signs={{ sx: -1, sz: 0 }} position={[rearX + 0.12, r + 0.3, 0]} lite={lite} inspect="suspension" hiddenWhenAssembled>
            <Shock from={[0, 0, -0.38]} to={[0, 0, 0.38]} mats={mats} seg={seg} />
          </ExplodingGroup>
        </>
      )}
    </>
  );
}

