/**
 * Сборка оптимизированных моделей из исходника.
 *
 *   npm run optimize:model
 *
 * Вход:  models-src/car.original.glb (не раздаётся сайтом)
 * Выход: public/models/car.glb        — десктоп, текстуры webp ≤ 2048, meshopt
 *        public/models/car-mobile.glb — мобильная, текстуры webp ≤ 1024, упрощённая геометрия
 *
 * Важно: узлы НЕ объединяются (без join/flatten/instance/palette) — по именам и
 * положению узлов сайт раскладывает модель на детали (lib/carParts.ts).
 */
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { statSync } from "node:fs";

const SRC = "models-src/car.original.glb";

/**
 * Параметры подобраны замерами (размер файла ↔ качество):
 * десктоп — почти без потерь (ошибка 0.04% размера меша, стыки панелей зафиксированы);
 * мобильная — ~1/3 треугольников; с lockBorder на этой модели появляются дыры, поэтому без него.
 */
const TARGETS = [
  { out: "public/models/car.glb", texture: 2048, quality: 75, simplify: { ratio: 0.7, error: 0.0004, lockBorder: true } },
  { out: "public/models/car-mobile.glb", texture: 1024, quality: 60, simplify: { ratio: 0.22, error: 0.004, lockBorder: false } },
];

/**
 * Материалы, которые сайт всё равно заменяет своими (components/three/jeskoMaterials.ts) —
 * у их примитивов цвета вершин не используются, удаляем. У остальных цвета вершин
 * несут затенение, их оставляем.
 */
const OVERRIDDEN = /^Material\.(001|005|006|010|011|058)$|^MI_/;

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const mb = (path) => (statSync(path).size / 1048576).toFixed(2) + " MB";

for (const t of TARGETS) {
  const doc = await io.read(SRC);
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (OVERRIDDEN.test(prim.getMaterial()?.getName() ?? "")) prim.setAttribute("COLOR_0", null);
    }
  }
  // Материалы не объединяем: по их именам сайт находит краску, стекло и карбон
  const steps = [dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), weld()];
  if (t.simplify) {
    // error — допустимое отклонение относительно размера меша; lockBorder фиксирует края мешей
    steps.push(simplify({ simplifier: MeshoptSimplifier, ...t.simplify }));
  }
  steps.push(
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: t.quality, resize: [t.texture, t.texture] }),
    // high — квантование с фильтрами (октаэдральные нормали и т.п.)
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await doc.transform(...steps);
  await io.write(t.out, doc);
  console.log(`${t.out}: ${mb(t.out)}`);
}
console.log(`source: ${mb(SRC)}`);
