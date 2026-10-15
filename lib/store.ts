import { create } from "zustand";

type AppState = {
  /** 3D-сцена отрисовала первый кадр */
  sceneReady: boolean;
  /** Реальный прогресс загрузки модели по байтам (0..1), null — модель не грузится */
  modelProgress: number | null;
  setModelProgress: (v: number) => void;
  /** Прелоадер завершился (живёт весь сеанс — при возврате на главную не показываем снова) */
  introDone: boolean;
  setSceneReady: (v: boolean) => void;
  setIntroDone: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  sceneReady: false,
  modelProgress: null,
  setModelProgress: (modelProgress) => set({ modelProgress }),
  introDone: false,
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setIntroDone: (introDone) => set({ introDone }),
}));
