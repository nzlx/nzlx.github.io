"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { PointLight } from "three";
import { pose } from "@/lib/scrollStages";
import { createCarMaterials, updateLights, type CarMaterials } from "./materials";
import { Hinge, LiteContext, Part } from "./Part";

/**
 * Low-poly спорткар из примитивов. Нос машины смотрит в +X, земля — y = 0.
 * Длина ≈ 4.4, ширина ≈ 1.9. Каждая деталь — отдельный <Part> со своим вектором разлёта.
 */

const WHEEL_X = 1.4;
const WHEEL_Z = 0.84;
const WHEEL_R = 0.36;

const WHEELS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function ProceduralCar({ lite = false }: { lite?: boolean }) {
  const m = useMemo(() => createCarMaterials(lite), [lite]);
  const seg = lite ? 16 : 32;
  const headLamp = useRef<PointLight>(null);

  useEffect(() => () => Object.values(m).forEach((mat) => mat.dispose()), [m]);

  useFrame(() => {
    updateLights(m, pose.lights);
    if (headLamp.current) headLamp.current.intensity = pose.lights * 8;
  });

  return (
    <LiteContext.Provider value={lite}>
      <group>
        <Body m={m} />
        <Glass m={m} />
        <Doors m={m} />
        <Hood m={m} />
        <Engine m={m} />
        <Seats m={m} />
        <Steering m={m} />
        <Suspension m={m} />
        <Lights m={m} />

        {WHEELS.map(([sx, sz], i) => (
          <Part
            key={`w${i}`}
            part={sx > 0 ? (sz < 0 ? "wheel_fl" : "wheel_fr") : sz < 0 ? "wheel_rl" : "wheel_rr"}
            position={[sx * WHEEL_X, WHEEL_R, sz * WHEEL_Z]}
            explode={[sx * 0.9, 0, sz * 1.8]}
            spin={[0, sz * 0.7, 0]}
          >
            <mesh material={m.rubber} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.28, seg]} />
            </mesh>
            <mesh material={m.trim} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[WHEEL_R * 0.72, WHEEL_R * 0.72, 0.285, seg]} />
            </mesh>
          </Part>
        ))}

        {WHEELS.map(([sx, sz], i) => (
          <Part
            key={`r${i}`}
            part="brakes"
            position={[sx * WHEEL_X, WHEEL_R, sz * (WHEEL_Z + 0.12)]}
            explode={[sx * 0.9, 0.25, sz * 2.8]}
            spin={[0, sz * 0.9, 0]}
          >
            <Rim m={m} side={sz} seg={seg} />
          </Part>
        ))}

        {!lite && (
          <pointLight
            ref={headLamp}
            position={[2.6, 0.6, 0]}
            color="#e4ecff"
            intensity={0}
            distance={6}
            decay={2}
          />
        )}
      </group>
    </LiteContext.Provider>
  );
}

type P = { m: CarMaterials };

function Body({ m }: P) {
  return (
    <Part part="body" explode={[0, 0.3, 0]}>
      {/* Нижняя часть кузова */}
      <RoundedBox args={[4.3, 0.42, 1.86]} radius={0.12} smoothness={4} position={[0, 0.55, 0]} material={m.paint} />
      {/* Задняя палуба */}
      <RoundedBox args={[0.5, 0.2, 1.8]} radius={0.06} smoothness={3} position={[-1.93, 0.82, 0]} material={m.paint} />
      {/* Передний бампер и решётка */}
      <RoundedBox args={[0.3, 0.2, 1.78]} radius={0.06} smoothness={3} position={[2.05, 0.4, 0]} material={m.paint} />
      <mesh position={[2.16, 0.5, 0]} material={m.trim}>
        <boxGeometry args={[0.04, 0.16, 1.1]} />
      </mesh>
      {/* Диффузор */}
      <mesh position={[-2.12, 0.42, 0]} material={m.trim}>
        <boxGeometry args={[0.1, 0.14, 1.5]} />
      </mesh>
      {/* Пороги */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0.36, s * 0.94]} material={m.trim}>
          <boxGeometry args={[2.2, 0.08, 0.05]} />
        </mesh>
      ))}
      {/* Арки колёс */}
      {WHEELS.map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * WHEEL_X, WHEEL_R, sz * 0.935]}
          rotation={[Math.PI / 2, 0, 0]}
          material={m.trim}
        >
          <cylinderGeometry args={[WHEEL_R + 0.06, WHEEL_R + 0.06, 0.02, 24, 1, false, 0, Math.PI]} />
        </mesh>
      ))}
      {/* Антикрыло */}
      <mesh position={[-2.0, 1.12, 0]} material={m.trim}>
        <boxGeometry args={[0.36, 0.04, 1.7]} />
      </mesh>
      {[0.5, -0.5].map((z) => (
        <mesh key={z} position={[-1.98, 1.0, z]} material={m.trim}>
          <boxGeometry args={[0.05, 0.2, 0.04]} />
        </mesh>
      ))}
      {/* Стойки A */}
      {[0.69, -0.69].map((z) => (
        <mesh key={z} position={[0.6, 1.04, z]} rotation={[0, 0, -0.675]} material={m.trim}>
          <boxGeometry args={[0.66, 0.05, 0.05]} />
        </mesh>
      ))}
    </Part>
  );
}

function Glass({ m }: P) {
  return (
    <Part part="glass" explode={[0, 2.0, 0]} spin={[0, 0, 0.18]}>
      {/* Крыша — часть «стеклянного» купола */}
      <RoundedBox args={[1.4, 0.07, 1.36]} radius={0.03} smoothness={2} position={[-0.35, 1.24, 0]} material={m.paint} />
      {/* Лобовое */}
      <mesh position={[0.6, 1.04, 0]} rotation={[0, 0, -0.675]} material={m.glass}>
        <boxGeometry args={[0.66, 0.025, 1.36]} />
      </mesh>
      {/* Заднее */}
      <mesh position={[-1.4, 1.08, 0]} rotation={[0, 0, 0.429]} material={m.glass}>
        <boxGeometry args={[0.79, 0.025, 1.3]} />
      </mesh>
      {/* Боковые */}
      {[0.69, -0.69].map((z) => (
        <mesh key={z} position={[-0.35, 1.03, z]} material={m.glass}>
          <boxGeometry args={[1.35, 0.36, 0.02]} />
        </mesh>
      ))}
    </Part>
  );
}

function Doors({ m }: P) {
  return (
    <>
      {[1, -1].map((s) => (
        <Part key={s} part={s < 0 ? "door_left" : "door_right"} explode={[0.1, 0.45, s * 1.9]} spin={[s * 0.3, 0, 0]}>
          {/* Двери «ножницы»: поднимаются вверх вокруг передней петли */}
          <Hinge pivot={[0.6, 0.58, s * 0.95]} open={[0, s * 0.15, -1.15]}>
            <RoundedBox
              args={[1.25, 0.42, 0.06]}
              radius={0.02}
              smoothness={2}
              position={[-0.625, 0, 0]}
              material={m.paint}
            />
            <mesh position={[-0.9, 0.08, s * 0.035]} material={m.trim}>
              <boxGeometry args={[0.22, 0.03, 0.01]} />
            </mesh>
          </Hinge>
        </Part>
      ))}
    </>
  );
}

function Hood({ m }: P) {
  return (
    <Part part="hood" explode={[1.8, 1.3, 0]} spin={[0, 0, 0.5]}>
      <Hinge pivot={[0.78, 0.8, 0]} open={[0, 0, 0.85]}>
        <RoundedBox args={[1.35, 0.07, 1.74]} radius={0.03} smoothness={2} position={[0.675, 0, 0]} material={m.paint} />
        {/* Гоночные полосы */}
        {[0.16, -0.16].map((z) => (
          <mesh key={z} position={[0.675, 0.037, z]} material={m.trim}>
            <boxGeometry args={[1.3, 0.004, 0.13]} />
          </mesh>
        ))}
      </Hinge>
    </Part>
  );
}

function Engine({ m }: P) {
  return (
    <Part
      part="engine"
      position={[1.35, 0.46, 0]}
      explode={[0.3, 2.6, 0]}
      spin={[0, 0.8, 0.15]}
    >
      {/* Масштаб подобран так, чтобы в собранном виде двигатель целиком прятался под капотом */}
      <group scale={0.75}>
      <RoundedBox args={[0.8, 0.3, 0.7]} radius={0.04} smoothness={2} material={m.metal} />
      {[0.2, -0.2].map((z) => (
        <mesh key={z} position={[0, 0.2, z]} material={m.detail}>
          <boxGeometry args={[0.7, 0.1, 0.18]} />
        </mesh>
      ))}
      {[-0.24, -0.08, 0.08, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} material={m.chrome}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 10]} />
        </mesh>
      ))}
      <mesh position={[-0.25, 0.33, 0]} rotation={[0, 0, 0]} material={m.trim}>
        <cylinderGeometry args={[0.13, 0.13, 0.07, 20]} />
      </mesh>
      </group>
    </Part>
  );
}

function Seats({ m }: P) {
  return (
    <Part part="interior" position={[-0.3, 0, 0]} explode={[-0.9, 2.0, 0]} spin={[0, -0.6, 0.15]}>
      {[0.38, -0.38].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <RoundedBox args={[0.5, 0.12, 0.42]} radius={0.04} smoothness={2} position={[0, 0.72, 0]} material={m.leather} />
          <RoundedBox
            args={[0.12, 0.55, 0.42]}
            radius={0.04}
            smoothness={2}
            position={[-0.26, 0.98, 0]}
            rotation={[0, 0, 0.2]}
            material={m.leather}
          />
          <mesh position={[-0.27, 0.98, 0]} rotation={[0, 0, 0.2]} material={m.detail}>
            <boxGeometry args={[0.125, 0.5, 0.06]} />
          </mesh>
        </group>
      ))}
    </Part>
  );
}

function Steering({ m }: P) {
  return (
    <Part
      part="interior"
      position={[0.28, 0.98, 0.38]}
      explode={[0.5, 2.6, 1.1]}
      spin={[0.6, 0.4, 0]}
    >
      <group rotation={[0, Math.PI / 2, 0.45]}>
        <mesh material={m.trim}>
          <torusGeometry args={[0.16, 0.025, 8, 28]} />
        </mesh>
        <mesh material={m.metal}>
          <boxGeometry args={[0.3, 0.03, 0.03]} />
        </mesh>
      </group>
      <mesh position={[0.12, -0.06, 0]} rotation={[0, 0, Math.PI / 2 - 0.45]} material={m.metal}>
        <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
      </mesh>
    </Part>
  );
}

function Suspension({ m }: P) {
  return (
    <>
      {[1, -1].map((sx) => (
        <Part
          key={sx}
          part="suspension"
          position={[sx * WHEEL_X, 0, 0]}
          explode={[sx * 0.35, 0.05, 0]}
          spin={[0.0, 0, sx * 0.1]}
        >
          {/* Ось */}
          <mesh position={[0, WHEEL_R, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
            <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
          </mesh>
          {/* Пружины и амортизаторы */}
          {[0.55, -0.55].map((z) => (
            <group key={z} position={[0, 0.56, z]}>
              <mesh material={m.chrome}>
                <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
              </mesh>
              {[-0.12, -0.06, 0, 0.06, 0.12].map((y) => (
                <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.detail}>
                  <torusGeometry args={[0.07, 0.012, 6, 14]} />
                </mesh>
              ))}
            </group>
          ))}
        </Part>
      ))}
    </>
  );
}

function Lights({ m }: P) {
  return (
    <>
      <Part part="lights" explode={[2.0, 0.5, 0]}>
        {[0.62, -0.62].map((z) => (
          <mesh key={z} position={[2.17, 0.64, z]} material={m.headlight}>
            <boxGeometry args={[0.05, 0.07, 0.38]} />
          </mesh>
        ))}
      </Part>
      <Part part="lights" explode={[-2.0, 0.5, 0]}>
        <mesh position={[-2.17, 0.66, 0]} material={m.taillight}>
          <boxGeometry args={[0.04, 0.04, 1.5]} />
        </mesh>
        {[0.62, -0.62].map((z) => (
          <mesh key={z} position={[-2.17, 0.66, z]} material={m.taillight}>
            <boxGeometry args={[0.05, 0.09, 0.32]} />
          </mesh>
        ))}
      </Part>
    </>
  );
}

function Rim({ m, side, seg }: { m: CarMaterials; side: number; seg: number }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={m.chrome}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, seg]} />
      </mesh>
      {/* Спицы */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[0, side * 0.03, 0]}
          rotation={[0, (i / 5) * Math.PI * 2, 0]}
          material={m.metal}
        >
          <boxGeometry args={[0.04, 0.02, 0.44]} />
        </mesh>
      ))}
      {/* Суппорт */}
      <mesh position={[0.12, -side * 0.05, 0.08]} material={m.detail}>
        <boxGeometry args={[0.1, 0.05, 0.14]} />
      </mesh>
    </group>
  );
}
