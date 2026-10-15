/**
 * Детали Koenigsegg Jesko Attack: маппинг узлов .glb на группы и сценарий разборки.
 * Тексты меток (названия и характеристики) — в data/content.ts → partLabels.
 *
 * Система координат сцены (после нормализации модели):
 *   +X — нос машины, +Y — вверх, -Z — левый борт (водитель), земля y = 0, центр в 0.
 */

export const PART_KEYS = [
  // кузов и навесное (из модели)
  "body_front", // передний клип: бампер, сплиттер, крылья
  "hood", // передний капот / багажник
  "roof", // съёмная крыша-тарга
  "rear_clamshell", // задняя крышка моторного отсека
  "rear_wing", // антикрыло со стойками
  "door_left",
  "door_right",
  "wheel_fl",
  "wheel_fr",
  "wheel_rl",
  "wheel_rr",
  "brakes", // диски и суппорты
  "glass",
  "lights",
  "interior", // сиденья, руль, панель
  "chassis", // днище, подрамники
  "body", // остальные кузовные панели
  "engine", // моторный отсек модели + процедурный V8
  // процедурные внутренние детали (их нет в модели)
  "gearbox", // Light Speed Transmission
  "monocoque",
  "suspension",
] as const;

export type PartKey = (typeof PART_KEYS)[number];

export const MODEL = {
  url: "/models/car.glb",
  mobileUrl: "/models/car-mobile.glb",
  /** Длина машины в единицах сцены (реальная 4.61 м масштабируется под камеру сцены) */
  length: 4.4,
  /** В исходной модели нос смотрит в +Z — поворачиваем в +X */
  rotationY: Math.PI / 2,
};

/* ------------------------------------------------------------------ */
/* Маппинг узлов модели                                                */
/* ------------------------------------------------------------------ */

/** Сведения об узле в координатах сцены (после нормализации) */
export type NodeInfo = {
  name: string;
  materials: string[];
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
};

/** «SK_Door_FL_101.003» → «SK_Door_FL_», «Attack:Ani_Wheel_FL133_Attack:MI…» → «Ani_Wheel_FL» */
export const baseName = (name: string) =>
  name
    .replace(/^Attack:/, "")
    .replace(/_Attack:.*$/, "")
    .replace(/(\.\d+)+$/, "")
    .replace(/\d+$/, "");

const MAT = {
  glass: /^Material\.(005|010)$/,
  light: /^(MI_Light|MI_Glass_Light)|^Material\.(015|018)$/,
  // T_Engine_D, heatshield, блок/подрамник, патрубки и выхлоп
  engine: /^Material\.(017|023|025|028)$|^MI_Engine|^MI_Exhaust/,
  // кожа, сиденья, строчка, ковры, приборы, ремни
  interior:
    /^Material$|^Material\.(013|014|016|021|022|026|029|036|046|047|049|051|053|054|055|056|057|060|061)$|^MI_Cabin|^MI_Carbon|^MI_Mirror_DP/,
};

/** Фара/фонарь: такие узлы светятся (эмиссия), но разлетаются вместе со своей частью кузова */
export function isLightNode(n: NodeInfo) {
  return /^SM_Light_[FB]/i.test(baseName(n.name)) || n.materials.some((m) => MAT.light.test(m));
}

/** Правила: имя → материал → положение. Порядок важен. */
export function classifyNode(n: NodeInfo): PartKey {
  const k = baseName(n.name);
  const has = (re: RegExp) => n.materials.some((m) => re.test(m));
  const left = n.center.z < 0;
  // Фары летят с передним клипом, стоп-сигналы — с задней крышкой (а не отдельными кусками)
  const lightsHome: PartKey = n.center.x > 0 ? "body_front" : "rear_clamshell";

  // Двери (с зеркалами и стёклами). Сторону берём по положению — в модели имена FL/FR перепутаны.
  if (/^(SK_Door_F|door_[lr]f|jeskf_badge_door|SM_SideMirror)/i.test(k)) return left ? "door_left" : "door_right";
  // Колёса: имена углов в модели не совпадают с позицией — только по положению
  if (/^(wheel_|Wheel1A|Ani_Wheel)/i.test(k)) {
    const front = n.center.x > 0;
    return front ? (left ? "wheel_fl" : "wheel_fr") : left ? "wheel_rl" : "wheel_rr";
  }
  if (/^(brake_|caliper_|SK_Brake)/i.test(k)) return "brakes";
  if (/^SK_Hood/i.test(k)) return "hood";
  if (/^(SK_Roof|SM_Roof_Cabin)/i.test(k)) return "roof";
  // Плоскости и стойки крыла висят высоко; гребень и стоп-сигнал на крышке — ниже
  if (/^SK_Spoiler/i.test(k)) return n.min.y > 0.85 ? "rear_wing" : "rear_clamshell";
  if (/^SK_Exhaust/i.test(k)) return "engine";
  if (/^SK_Trunk/i.test(k)) return has(MAT.engine) ? "engine" : "rear_clamshell";
  if (/^(SM_Bumper_F|SM_Fender_F)/i.test(k)) return "body_front";
  if (/^SM_Light_[FB]/i.test(k)) return lightsHome;
  if (/^(SM_Cabin|SK_Body_Bones|keyfob|int$|Cylinder$)/i.test(k)) return "interior";
  // SM_Engine в модели — радиаторы переднего отсека, а не мотор
  if (/^(SM_Engine|engine$)/i.test(k)) return "chassis";
  // Карбоновая база: передняя часть — сплиттер, остальное — пороги/днище
  if (/^bodyshell/i.test(k)) return n.center.x > 1.3 ? "body_front" : "chassis";

  // SM_Body и прочее: по материалам, затем по положению
  if (has(MAT.glass)) return "glass";
  if (has(MAT.light)) return lightsHome;
  if (has(MAT.engine)) return "engine";
  if (has(MAT.interior)) return "interior";
  if (n.max.y < 0.3) return "chassis";
  return "body";
}

/* ------------------------------------------------------------------ */
/* Режим осмотра                                                       */
/* ------------------------------------------------------------------ */

/**
 * Группы осмотра: клик по любой детали группы открывает её карточку.
 * Порядок — порядок переключения «Предыдущая / Следующая». Тексты — content.parts.
 * labelOn — экземпляр, к которому ведётся линия подписи (ближний к камере борт).
 */
export const INSPECT_GROUPS = [
  { id: "rear_wing", parts: ["rear_wing"] },
  { id: "engine", parts: ["engine"] },
  { id: "gearbox", parts: ["gearbox"] },
  { id: "monocoque", parts: ["monocoque"] },
  { id: "suspension", parts: ["suspension"], labelOn: "suspension|-1|1" },
  { id: "doors", parts: ["door_left", "door_right"], labelOn: "door_right" },
  { id: "wheels", parts: ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "brakes"], labelOn: "wheel_fr" },
  { id: "roof", parts: ["roof"] },
  { id: "body_front", parts: ["body_front"] },
] as const satisfies readonly { id: string; parts: readonly PartKey[]; labelOn?: string }[];

export type InspectId = (typeof INSPECT_GROUPS)[number]["id"];

export const inspectGroupOf = (part: PartKey): InspectId | null =>
  INSPECT_GROUPS.find((g) => (g.parts as readonly PartKey[]).includes(part))?.id ?? null;

/* ------------------------------------------------------------------ */
/* Сценарий разборки                                                   */
/* ------------------------------------------------------------------ */

type Vec3 = [number, number, number];

/**
 * Положение экземпляра детали: sx — перед(+1)/зад(-1), sz — правый(+1)/левый(-1) борт,
 * 0 — деталь по центру. Нужен, чтобы колёса, тормоза, фары, панели летели «от центра».
 */
export type Signs = { sx: number; sz: number };

export type ExplodeSpec = {
  /** Слой разборки 1..5 — слои стартуют по очереди с задержкой */
  layer: 1 | 2 | 3 | 4 | 5;
  offset: (s: Signs) => Vec3;
  spin: (s: Signs) => Vec3;
};

const still = (): Vec3 => [0, 0, 0];
const wheel: ExplodeSpec = {
  layer: 3,
  offset: (s) => [s.sx * 0.25, 0, s.sz * 1.6],
  spin: (s) => [0, s.sz * 0.5, 0],
};

export const EXPLODE: Record<PartKey, ExplodeSpec> = {
  // 1. антикрыло вверх-назад, крыша вверх, двери в стороны
  rear_wing: { layer: 1, offset: () => [-1.15, 1.95, 0], spin: () => [0, 0, -0.22] },
  roof: { layer: 1, offset: () => [0.15, 2.15, 0], spin: () => [0.12, 0, 0.1] },
  door_left: { layer: 1, offset: () => [0.15, 0.3, -1.45], spin: () => [-0.18, 0.1, 0] },
  door_right: { layer: 1, offset: () => [0.15, 0.3, 1.45], spin: () => [0.18, -0.1, 0] },
  // 2. капот вперёд-вверх, задняя крышка назад-вверх, бампер вперёд
  hood: { layer: 2, offset: () => [1.25, 1.2, 0], spin: () => [0, 0, 0.35] },
  rear_clamshell: { layer: 2, offset: () => [-1.6, 1.05, 0], spin: () => [0, 0, -0.28] },
  body_front: { layer: 2, offset: () => [1.6, -0.02, 0], spin: () => [0, 0, 0.05] },
  lights: { layer: 2, offset: (s) => [s.sx * 2.05, 0.35, 0], spin: (s) => [0, s.sx * 0.2, 0] },
  // 3. колёса наружу по осям, тормоза отдельно от колёс
  wheel_fl: wheel,
  wheel_fr: wheel,
  wheel_rl: wheel,
  wheel_rr: wheel,
  brakes: { layer: 3, offset: (s) => [s.sx * 0.25, 0.05, s.sz * 0.95], spin: (s) => [0, s.sz * 0.35, 0] },
  // 4. кузовные панели расходятся, открывая монокок, V8 и коробку
  body: {
    layer: 4,
    offset: (s) => (s.sz === 0 ? [0, 1.1, 0] : [0, 0.2, s.sz * 1.05]),
    spin: (s) => [s.sz * 0.12, 0, 0],
  },
  glass: { layer: 4, offset: () => [0.35, 1.45, 0], spin: () => [0, 0, 0.12] },
  interior: { layer: 4, offset: () => [0.1, 0.6, 0], spin: () => [0, 0.08, 0] },
  monocoque: { layer: 4, offset: () => [0, 0.08, 0], spin: still },
  chassis: { layer: 4, offset: () => [0, -0.04, 0], spin: still },
  // 5. двигатель вверх-назад, коробка назад, подвеска наружу
  engine: { layer: 5, offset: () => [-0.55, 0.95, 0], spin: () => [0, 0.12, 0.06] },
  gearbox: { layer: 5, offset: () => [-1.35, 0.2, 0], spin: () => [0, 0.35, 0.1] },
  suspension: {
    layer: 5,
    offset: (s) => (s.sz === 0 ? [-0.75, 0.3, 0] : [s.sx * 0.3, 0.05, s.sz * 0.75]),
    spin: (s) => [s.sz * 0.2, 0, 0],
  },
};

const LAYER_STEP = 0.14;
const LAYER_DURATION = 0.44;

/** Прогресс конкретного слоя (0..1) при общем прогрессе разборки explode (0..1) */
export function layerProgress(layer: number, explode: number) {
  const t = Math.min(1, Math.max(0, (explode - (layer - 1) * LAYER_STEP) / LAYER_DURATION));
  return t * t * (3 - 2 * t);
}

/** На мобильных разлетаются только крупные детали, остальные остаются на месте */
export const MOBILE_EXPLODE_PARTS: PartKey[] = [
  "rear_wing",
  "roof",
  "door_left",
  "door_right",
  "hood",
  "rear_clamshell",
  "body_front",
  "wheel_fl",
  "wheel_fr",
  "wheel_rl",
  "wheel_rr",
  "engine",
];

export const canExplode = (part: PartKey, lite: boolean) => !lite || MOBILE_EXPLODE_PARTS.includes(part);

/* ------------------------------------------------------------------ */
/* Двери dihedral synchro-helix                                        */
/* ------------------------------------------------------------------ */

/**
 * Дверь вращается вокруг наклонной оси у основания передней стойки: задняя кромка
 * уходит вверх, сама дверь разворачивается вперёд и наружу, плюс небольшой вынос наружу.
 * `out` — знак внешней стороны (-1 левая дверь, +1 правая).
 */
export const DOOR = {
  angle: 1.45, // ≈ 83°
  axis: (out: number): Vec3 => [0.18, out * 0.42, -1],
  shift: (out: number): Vec3 => [0.05, 0.04, out * 0.1],
};
