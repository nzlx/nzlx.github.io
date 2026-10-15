# 3D-модель

`car.glb` / `car-mobile.glb` — «2024 Koenigsegg Jesko Attack #7378», автор HYPRIMPS3D,
лицензия CC BY 4.0 (атрибуция выводится в футере, данные — `MODEL.credit` в `lib/carParts.ts`).

Файлы здесь — **результат сборки**, не редактируйте их вручную:

    npm run optimize:model

Скрипт `scripts/optimize-model.mjs` берёт исходник `models-src/car.original.glb` и делает:
- десктоп: текстуры webp ≤ 2048, лёгкое упрощение геометрии (почти без потерь), meshopt;
- мобильная: текстуры webp ≤ 1024, ~1/3 треугольников, meshopt.

Узлы не объединяются — сайт раскладывает модель на детали по именам, материалам и положению
узлов (`classifyNode` в `lib/carParts.ts`). Проверить раскладку: открыть сайт с `?debug=parts` —
каждая группа деталей окрашивается своим цветом, сводка выводится в консоль.

Если модели нет, сайт строит low-poly машину из примитивов (`components/three/ProceduralCar.tsx`).
