/**
 * Прогресс каждой секции (0..1). GSAP + ScrollTrigger (scrub) пишут сюда,
 * 3D-сцена читает в useFrame. Объект мутабельный — без ре-рендеров React.
 */
export const stages = {
  design: 0,
  anatomy: 0,
  aero: 0,
  specs: 0,
  finale: 0,
};

export type StageKey = keyof typeof stages;

export const resetStages = () => {
  (Object.keys(stages) as StageKey[]).forEach((k) => (stages[k] = 0));
};

/**
 * Вращение машины пользователем (перетаскивание). yaw — накопленный угол,
 * velocity — скорость для инерции после отпускания (рад/с).
 */
export const drag = { yaw: 0, velocity: 0, active: false };

/** Позиция курсора в нормализованных координатах (-1..1) */
export const pointer = { x: 0, y: 0 };

/**
 * Итоговая «поза» машины на текущий кадр. Вычисляется один раз в CarRig
 * из сглаженных stages и используется всеми деталями.
 */
export const pose = {
  explode: 0,
  doors: 0,
  float: 0,
  lights: 0,
  labels: 0,
  /** Притушить сцену (0..1) — под карточками аэродинамики */
  dim: 0,
};
