import { create } from "zustand";

type ExitModalState = {
  isOpen: boolean;
  destination: string;
  open: (destination?: string) => void;
  close: () => void;
};

export const useExitModal = create<ExitModalState>((set) => ({
  isOpen: false,
  destination: "/learn",
  open: (destination = "/learn") => set({ isOpen: true, destination }),
  close: () => set({ isOpen: false }),
}));
