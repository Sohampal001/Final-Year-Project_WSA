import { create } from "zustand";

export interface Location {
  lat: number;
  lon: number;
  accuracy: number | null;
}

export interface IUseLocationStore {
  location: Location | null;
  setLocation: (loc: Location) => void;
}

export const useLocationStore = create<IUseLocationStore>((set) => ({
  location: null,
  setLocation: (loc: Location) => set({ location: loc }),
}));
