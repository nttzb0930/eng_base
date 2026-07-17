import { create } from "zustand";

type HeartsModalState = {
  isOpen: boolean;
  lessonId: number | null;
  open: (lessonId?: number) => void;
  close: () => void;
};

export const useHeartsModal = create<HeartsModalState>((set) => ({
  isOpen: false,
  lessonId: null,
  open: (lessonId?: number) => set({ isOpen: true, lessonId: lessonId ?? null }),
  close: () => set({ isOpen: false, lessonId: null }),
}));
