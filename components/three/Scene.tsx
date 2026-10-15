"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { ContactShadows, PerformanceMonitor, Preload } from "@react-three/drei";
import { Bloom, EffectComposer, Outline } from "@react-three/postprocessing";
import { useAppStore } from "@/lib/store";
import { useFinePointer, useIsMobile, useReducedMotion } from "@/lib/hooks";
import { pieces, setGhost, useInspect } from "@/lib/inspect";
import { MODEL } from "@/lib/carParts";
import { CarRig } from "./CarRig";
import { GLBCar } from "./GLBCar";
import { ProceduralCar } from "./ProceduralCar";
import { StudioEnvironment } from "./StudioEnvironment";
import { Inspector } from "./Inspector";
import { LabelLayout, PartLabelsLayer } from "./PartLabels";

/** Проверяем, существует ли .glb (HEAD-запрос). null — ещё проверяем. */
function useModelAvailable(url: string) {
  const [state, setState] = useState<{ url: string; ok: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") ?? "";
        return r.ok && !type.includes("text/html");
      })
      .catch(() => false)
      .then((ok) => alive && setState({ url, ok }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state?.url === url ? state.ok : null;
}

/** Если .glb битый — откатываемся на процедурную машину */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[car] Не удалось загрузить модель, используем процедурную:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Прогрев шейдеров под прелоадером: компилируем обычные и «призрачные» (прозрачные)
 * варианты материалов всех деталей, включая спрятанные внутренние. Иначе первая разборка
 * и первое открытие режима осмотра упирались бы в многосекундную компиляцию.
 */
async function warmUp(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const list = [...pieces.values()];
  // compile видит только видимые объекты — внутренние детали временно показываем
  // (их видимость вернёт useFrame на следующем кадре)
  list.forEach((p) => (p.visible = true));
  await gl.compileAsync(scene, camera);
  list.forEach((p) => {
    p.visible = true;
    setGhost(p, 0.5);
  });
  await gl.compileAsync(scene, camera);
  list.forEach((p) => setGhost(p, 0));
}

/** Сообщает прелоадеру, что сцена отрисовала первые кадры и шейдеры прогреты */
function ReadySignal() {
  const setSceneReady = useAppStore((s) => s.setSceneReady);
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current !== 3) return;
    const timeout = new Promise((resolve) => setTimeout(resolve, 6000));
    Promise.race([warmUp(gl, scene, camera), timeout])
      .catch((e) => console.warn("[scene] прогрев шейдеров не удался:", e))
      .finally(() => setSceneReady(true));
  });
  return null;
}

function CarModel({ lite }: { lite: boolean }) {
  const url = lite ? MODEL.mobileUrl : MODEL.url;
  const available = useModelAvailable(url);
  if (available === null) return null;
  const procedural = <ProceduralCar lite={lite} />;
  return (
    <>
      {available ? (
        <ModelBoundary fallback={procedural}>
          <GLBCar url={url} lite={lite} />
        </ModelBoundary>
      ) : (
        procedural
      )}
      <ReadySignal />
    </>
  );
}

export default function Scene() {
  const mobile = useIsMobile();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  // Контур детали под курсором (только мышь и десктоп)
  const outline = useInspect((s) => s.outline);
  const [dpr, setDpr] = useState(mobile ? 1.25 : 1.75);
  const maxDpr = mobile ? 1.5 : 2;

  return (
    <>
    {/* В режиме осмотра слой поднимается над страницей (.is-inspecting в globals.css) */}
    <div className="scene-layer pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={Math.min(dpr, maxDpr)}
        gl={{ antialias: !mobile, powerPreference: "high-performance" }}
        camera={{ fov: 35, near: 0.1, far: 100, position: [6, 2, 6] }}
        onCreated={({ gl }) => gl.setClearColor("#0a0a0a")}
      >
        {/* Адаптивное разрешение: при просадке FPS снижаем dpr */}
        <PerformanceMonitor
          onIncline={() => setDpr(maxDpr)}
          onDecline={() => setDpr(1)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <fog attach="fog" args={["#0a0a0a", 18, 40]} />
        <directionalLight position={[5, 8, 4]} intensity={1.2} />

        <Suspense fallback={null}>
          <StudioEnvironment lite={mobile} />
          <CarRig reduced={reduced}>
            <CarModel lite={mobile} />
          </CarRig>

          {!mobile && (
            <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={16} blur={2.4} far={4} resolution={512} />
          )}
          {!mobile && (
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.45} radius={0.6} luminanceThreshold={1} luminanceSmoothing={0.15} />
              <Outline
                selection={fine ? outline : []}
                visibleEdgeColor={0xc8ff00}
                hiddenEdgeColor={0xc8ff00}
                edgeStrength={6}
                blur
                xRay
              />
            </EffectComposer>
          )}
          <Preload all />
        </Suspense>
        <Inspector fine={fine} />
        <LabelLayout />
      </Canvas>
      {/* Лёгкое затемнение фона в режиме осмотра */}
      <div className="scene-vignette" />
    </div>
    <PartLabelsLayer />
    </>
  );
}
