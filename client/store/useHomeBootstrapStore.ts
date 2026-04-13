import { create } from "zustand";
import {
  fetchHomeData,
  HomeNearbyLocations,
  HomeNearbyUser,
} from "../api/homeApi";
import { useAuthStore } from "./useAuthStore";
import { useLocationStore } from "./useLocationStore";
import { useSafetyStore } from "./useSafetyStore";

const EMPTY_NEARBY_LOCATIONS: HomeNearbyLocations = {
  policeStations: [],
  hospitals: [],
  pharmacies: [],
  busStops: [],
};

interface BootstrapOptions {
  latitude?: number;
  longitude?: number;
  force?: boolean;
}

interface HomeBootstrapState {
  nearbyUsers: HomeNearbyUser[];
  nearbyLocations: HomeNearbyLocations;
  warnings: string[];
  isBootstrapping: boolean;
  lastBootstrappedAt: number | null;
  bootstrapHomeData: (options?: BootstrapOptions) => Promise<boolean>;
  clearBootstrapCache: () => void;
}

export const useHomeBootstrapStore = create<HomeBootstrapState>((set, get) => ({
  nearbyUsers: [],
  nearbyLocations: EMPTY_NEARBY_LOCATIONS,
  warnings: [],
  isBootstrapping: false,
  lastBootstrappedAt: null,

  bootstrapHomeData: async (options = {}) => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.token) {
      return false;
    }

    if (get().isBootstrapping) {
      return false;
    }

    const force = options.force ?? false;
    const lastBootstrappedAt = get().lastBootstrappedAt;

    // Prevent duplicate calls from quick app state changes.
    if (
      !force &&
      lastBootstrappedAt &&
      Date.now() - lastBootstrappedAt < 30000
    ) {
      return true;
    }

    const location = useLocationStore.getState().location;
    const latitude =
      options.latitude ??
      (Number.isFinite(location?.lat) ? location?.lat : undefined);
    const longitude =
      options.longitude ??
      (Number.isFinite(location?.lon) ? location?.lon : undefined);

    set({ isBootstrapping: true });

    try {
      const response = await fetchHomeData({ latitude, longitude });
      const payload = response.data;

      // Existing global stores are updated directly.
      if (payload?.user) {
        useAuthStore.getState().updateUser(payload.user);
      }

      await useAuthStore
        .getState()
        .setTrustedContacts((payload?.trustedContacts || []) as any);

      if (
        Number.isFinite(payload?.location?.latitude) &&
        Number.isFinite(payload?.location?.longitude)
      ) {
        useLocationStore.getState().setLocation({
          lat: Number(payload.location?.latitude),
          lon: Number(payload.location?.longitude),
          accuracy: null,
        });
      }

      if (typeof payload?.codeWord === "string" && payload.codeWord.trim()) {
        await useSafetyStore.getState().setCodeword(payload.codeWord);
      }

      set({
        nearbyUsers: payload?.nearbyUsers || [],
        nearbyLocations: payload?.nearbyLocations || EMPTY_NEARBY_LOCATIONS,
        warnings: response.warnings || [],
        isBootstrapping: false,
        lastBootstrappedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error("Failed to bootstrap home data", error);
      set({ isBootstrapping: false });
      return false;
    }
  },

  clearBootstrapCache: () => {
    set({
      nearbyUsers: [],
      nearbyLocations: EMPTY_NEARBY_LOCATIONS,
      warnings: [],
      isBootstrapping: false,
      lastBootstrappedAt: null,
    });
  },
}));
