/**
 * Весь текст сайта в одном месте.
 * Учебный сайт-витрина Koenigsegg Jesko Attack — неофициальный, не связан с Koenigsegg.
 */
import type { InspectId } from "@/lib/carParts";

export type Part = {
  id: InspectId;
  title: string;
  /** Короткая строка на подписи у детали */
  label: string;
  description: string;
  specs: string[];
};

export type Photo = {
  src: string;
  alt: string;
  /** Кадрирование для object-fit: cover (CSS object-position) */
  position: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** Страница файла на Wikimedia Commons */
  sourceUrl: string;
};

export type Fact = { title: string; text: string; size: "large" | "wide" | "tall" | "small"; photo: Photo };

export type Spec = { value: number; unit: string; label: string };

export const content = {
  meta: {
    title: "Koenigsegg Jesko Attack — 3D-разбор",
    description:
      "Интерактивный 3D-разбор Koenigsegg Jesko Attack: разберите гиперкар на детали и осмотрите V8, коробку LST и аэродинамику. Учебный неофициальный проект.",
    siteName: "Jesko Attack 3D",
    ogAlt: "Koenigsegg Jesko Attack — 3D-модель в перламутровом белом с салатовыми акцентами",
  },

  brand: {
    make: "Koenigsegg",
    model: "Jesko Attack",
    mark: "J/A",
  },

  nav: [
    { label: "Дизайн", href: "#design" },
    { label: "Устройство", href: "#anatomy" },
    { label: "Аэродинамика", href: "#aero" },
    { label: "Характеристики", href: "#specs" },
  ],

  header: {
    cta: "Цифры",
    ctaHref: "#specs",
  },

  /** Боковой индикатор прогресса */
  progress: [
    { id: "hero", label: "Старт" },
    { id: "design", label: "Дизайн" },
    { id: "anatomy", label: "Устройство" },
    { id: "aero", label: "Аэро" },
    { id: "specs", label: "Цифры" },
    { id: "finale", label: "Финал" },
  ],

  preloader: {
    note: "Прогреваем V8…",
  },

  sections: {
    hero: {
      eyebrow: "Koenigsegg",
      title: ["Jesko", "Attack"],
      subtitle: "Инженерия на пределе возможного",
      meta: ["Ängelholm, Швеция", "Трековая версия Jesko"],
      rotateHint: "Тяните, чтобы покрутить",
      scrollHint: "Scroll to explore",
    },
    design: {
      index: "01",
      label: "Дизайн",
      text:
        "Форма Jesko Attack рождена потоком воздуха. Карбоновый кузов, низкий нос, кабина-капля — и двери, которых нет ни у кого. Dihedral synchro-helix: на компактных петлях у передней стойки дверь одновременно поворачивается вперёд и уходит вверх, освобождая проём и не задевая бордюр.",
      note: "Двери Dihedral synchro-helix — фирменное решение Koenigsegg",
    },
    anatomy: {
      index: "02",
      label: "Устройство",
      subtitle: "Слой за слоем: кузов, колёса, монокок и сердце машины.",
      hint: "Нажмите на деталь, чтобы осмотреть её",
    },
    aero: {
      index: "03",
      label: "Аэродинамика",
      title: "Воздух как инструмент",
      subtitle: "Каждая поверхность прижимает машину к асфальту.",
    },
    specs: {
      index: "04",
      label: "Характеристики",
      note: "Мощность — на топливе E85",
    },
    finale: {
      index: "05",
      label: "Имя",
      title: "Jesko.",
      text: "Назван в честь Йеско фон Кёнигсегга — отца основателя компании.",
      backToTop: "Наверх",
    },
    footer: {
      project: "Учебный проект · 2026",
      attribution: {
        prefix: "3D-модель",
        title: "2024 Koenigsegg Jesko Attack #7378",
        url: "https://sketchfab.com/3d-models/2024-koenigsegg-jesko-attack-7378-e4e966bcfdf14a8dbc6c837764cb026b",
        by: "by",
        author: "HYPRIMPS3D",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        changes: "изменена: разделена на детали, перекрашена, сжата",
      },
      photos: {
        prefix: "Фото",
        changes: "кадрированы и сжаты",
      },
      disclaimer: "Неофициальный сайт. Не связан с Koenigsegg Automotive AB. Названия и марки принадлежат их владельцам.",
    },
  },

  /**
   * Детали для режима осмотра (секция «Устройство»). Порядок — порядок переключения.
   * label — короткая строка на подписи у детали; specs — строки характеристик в панели.
   */
  parts: [
    {
      id: "rear_wing",
      title: "Антикрыло",
      label: "До 1400 кг прижимной силы",
      description:
        "Крыло закреплено сверху, на стойках-«лебединых шеях»: нижняя поверхность, которая создаёт основную прижимную силу, остаётся чистой. На высокой скорости оно буквально вдавливает машину в асфальт.",
      specs: ["Прижимная сила — до 1400 кг", "Крепление сверху (swan neck)", "Карбоновая конструкция"],
    },
    {
      id: "engine",
      title: "Двигатель",
      label: "5.1 L twin-turbo V8 · 1600 л.с. на E85",
      description:
        "Собственный V8 Koenigsegg с двумя турбинами и плоским коленвалом. Чтобы турбины раскручивались без задержки, у двигателя есть небольшой компрессор и карбоновый ресивер со сжатым воздухом.",
      specs: ["5.1 L · V8 · twin-turbo", "1600 л.с. на E85 · 1280 л.с. на бензине", "1500 Н·м", "Отсечка 8500 об/мин"],
    },
    {
      id: "gearbox",
      title: "Коробка Light Speed Transmission",
      label: "LST · 9 ступеней · 7 сцеплений",
      description:
        "Девятиступенчатая коробка с семью сцеплениями — разработка Koenigsegg. Она может перейти не только на соседнюю, а сразу на любую нужную передачу, почти без разрыва тяги.",
      specs: ["9 ступеней", "7 мокрых сцеплений", "Переход сразу на любую передачу"],
    },
    {
      id: "monocoque",
      title: "Монокок",
      label: "Карбоновый монокок",
      description:
        "Несущая основа машины — карбоновая капсула с сотовым заполнителем. К ней крепятся передняя подвеска, двигатель и вся аэродинамика; она же защищает водителя и пассажира.",
      specs: ["Углеволокно с сотовым заполнителем", "Двухместная защитная капсула", "Крепление подвески и двигателя"],
    },
    {
      id: "suspension",
      title: "Подвеска",
      label: "Triplex с горизонтальным задним амортизатором",
      description:
        "Двухрычажная подвеска на каждом колесе и фирменный Triplex: третий, горизонтальный амортизатор связывает задние колёса и не даёт машине «приседать» при резком разгоне.",
      specs: ["Двойные поперечные рычаги", "Triplex — третий горизонтальный амортизатор", "Подруливающие задние колёса"],
    },
    {
      id: "doors",
      title: "Двери",
      label: "Dihedral synchro-helix",
      description:
        "Фирменные двери Koenigsegg: на компактных петлях у передней стойки дверь одновременно поворачивается вперёд и поднимается вверх. Ей нужно совсем немного места сбоку — открывается даже у высокого бордюра.",
      specs: ["Dihedral synchro-helix", "Петли у основания передней стойки", "Поворот вперёд + подъём вверх"],
    },
    {
      id: "wheels",
      title: "Колёса и тормоза",
      label: "Карбон-керамические тормоза · центральная гайка",
      description:
        "Колёса держатся на одной центральной гайке, как в гонках. За спицами — карбон-керамические тормоза: лёгкие и стабильные даже после серии торможений с высоких скоростей.",
      specs: ["Карбон-керамические тормоза", "Крепление на центральную гайку", "20″ спереди · 21″ сзади"],
    },
    {
      id: "roof",
      title: "Крыша-тарга",
      label: "Съёмная карбоновая крыша",
      description:
        "Карбоновую крышу можно снять и убрать в передний багажник — Jesko превращается в тарга-родстер, не меняя ни одной детали кузова.",
      specs: ["Карбон", "Хранится в переднем багажнике", "Кабина в форме капли"],
    },
    {
      id: "body_front",
      title: "Передний обвес",
      label: "Сплиттер и активные закрылки",
      description:
        "Нос из карбона с крупным сплиттером: он отсекает поток под днищем и создаёт прижимную силу на передней оси. Подвижные элементы спереди подстраивают аэробаланс под скорость.",
      specs: ["Карбоновый сплиттер", "Активная аэродинамика спереди", "Фары в едином модуле"],
    },
  ] satisfies Part[],

  /** Интерфейс режима осмотра */
  inspect: {
    cursor: "Осмотреть",
    specsTitle: "Характеристики",
    prev: "← Предыдущая",
    next: "Следующая →",
    close: "Закрыть",
    hint: "Esc — закрыть · ← → — соседние детали · тяните, чтобы вращать",
  },

  /** Короткие факты об аэродинамике — стеклянные карточки */
  facts: [
    {
      title: "Антикрыло",
      text: "Крепится сверху, на «лебединых шеях»: нижняя поверхность остаётся чистой и работает в полную силу.",
      size: "large",
      photo: {
        src: "/images/aero/wing.webp",
        alt: "Koenigsegg Jesko сзади: заднее антикрыло на верхних креплениях",
        position: "50% 45%",
        author: "MrWalkr",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:2023_Koenigsegg_Jesko_Rear_LC24.jpg",
      },
    },
    {
      title: "Передний сплиттер",
      text: "Направляет поток под днище и создаёт прижимную силу на передней оси.",
      size: "tall",
      photo: {
        src: "/images/aero/splitter.webp",
        alt: "Koenigsegg Jesko Attack спереди с низкой точки: передний сплиттер",
        position: "15% 60%",
        author: "MrWalkr",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:2025_Koenigsegg_Jesko_Attack_SP25_Low.jpg",
      },
    },
    {
      title: "Активная аэродинамика",
      text: "Подвижные элементы спереди меняют баланс в зависимости от скорости и режима.",
      size: "small",
      photo: {
        src: "/images/aero/active-aero.webp",
        alt: "Koenigsegg Jesko Attack в движении на улицах Монако",
        position: "50% 55%",
        author: "MrWalkr",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:2025_Koenigsegg_Jesko_Attack_7399.jpg",
      },
    },
    {
      title: "Подруливающие задние колёса",
      text: "На малой скорости делают машину вёртче, на высокой — стабильнее в длинных поворотах.",
      size: "small",
      photo: {
        src: "/images/aero/rear-steering.webp",
        alt: "Koenigsegg Jesko сбоку в движении на Goodwood Festival of Speed",
        position: "55% 60%",
        author: "Michele Borioli",
        license: "CC BY 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Goodwood_edited-58_(53863543920).jpg",
      },
    },
  ] satisfies Fact[],

  /** Анимированные счётчики */
  specs: [
    { value: 1600, unit: "л.с.", label: "мощность" },
    { value: 1500, unit: "Н·м", label: "крутящий момент" },
    { value: 8500, unit: "об/мин", label: "отсечка" },
    { value: 1420, unit: "кг", label: "снаряжённая масса" },
    { value: 1400, unit: "кг", label: "прижимная сила" },
  ] satisfies Spec[],

  marquee: [
    "Jesko Attack",
    "Twin-turbo V8",
    "Light Speed Transmission",
    "Triplex",
    "Carbon monocoque",
    "Synchro-helix",
    "1600 hp",
    "Ängelholm",
  ],

  notFound: {
    text: "Эта дорога никуда не ведёт.",
    back: "На главную",
  },
};

export type Content = typeof content;
