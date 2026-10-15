"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Студийное окружение из Lightformer-панелей. Рендерится один раз (frames=1),
 * работает офлайн (в отличие от preset="studio", который качает HDR с CDN)
 * и даёт характерные «полосы» софтбоксов на глянцевом кузове.
 */
export function StudioEnvironment({ lite }: { lite: boolean }) {
  return (
    <Environment resolution={lite ? 128 : 256} frames={1}>
      {/* Верхний софтбокс */}
      <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[12, 6, 1]} />
      {/* Полосы над машиной — отражаются на капоте и крыше */}
      <group rotation={[0, 0.5, 0]}>
        {[-6, -2, 2, 6].map((z, i) => (
          <Lightformer
            key={i}
            form="rect"
            intensity={1.6}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 4, z]}
            scale={[8, 0.6, 1]}
          />
        ))}
      </group>
      {/* Боковые панели */}
      <Lightformer intensity={1.5} rotation-y={Math.PI / 2} position={[-8, 1, 0]} scale={[20, 1.2, 1]} />
      <Lightformer intensity={1.5} rotation-y={-Math.PI / 2} position={[8, 1, 0]} scale={[20, 1.2, 1]} />
      {/* Цветные акценты в отражениях */}
      <Lightformer form="ring" color="#ffffff" intensity={2.5} scale={3} position={[-6, 2, -6]} target={[0, 0, 0]} />
      <Lightformer form="ring" color="#c8ff00" intensity={2} scale={2} position={[6, 1.5, 6]} target={[0, 0, 0]} />
    </Environment>
  );
}
