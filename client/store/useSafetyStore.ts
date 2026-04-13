import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const HASHED_CODEWORD_KEY = "hashedCodeword";

interface SafetyState {
  isBackgroundListening: boolean;
  hashedCodeword: string | null;
  toggleBackgroundListening: (status: boolean) => void;
  setCodeword: (codeword: string) => Promise<void>;
  verifyCodeword: (input: string) => boolean;
  loadSafetySettings: () => Promise<void>;
  syncCodewordFromServer: () => Promise<void>;
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  isBackgroundListening: false,
  hashedCodeword: null,

  toggleBackgroundListening: (status) => {
    set({ isBackgroundListening: status });
    AsyncStorage.setItem("isBackgroundListening", JSON.stringify(status));
  },

  setCodeword: async (codeword: string) => {
    const hashed = CryptoJS.SHA256(codeword.toLowerCase().trim()).toString();
    set({ hashedCodeword: hashed });

    // Always overwrite the hashed value from latest source (signup/sync).
    await AsyncStorage.setItem(HASHED_CODEWORD_KEY, hashed);
  },

  verifyCodeword: (input: string) => {
    const { hashedCodeword } = get();

    if (!hashedCodeword) return false;
    const inputHashed = CryptoJS.SHA256(input.toLowerCase().trim()).toString();

    return inputHashed === hashedCodeword;
  },

  loadSafetySettings: async () => {
    try {
      const listening = await AsyncStorage.getItem("isBackgroundListening");
      const savedHash = await AsyncStorage.getItem(HASHED_CODEWORD_KEY);

      set({
        isBackgroundListening: listening ? JSON.parse(listening) : false,
        hashedCodeword: savedHash || null,
      });

      // Auto-sync codeword from backend silently if token exists
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        get()
          .syncCodewordFromServer()
          .catch(() => {});
      }
    } catch (e) {
      console.error("Error loading safety settings", e);
    }
  },

  syncCodewordFromServer: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/codeword/get`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(response.data);

      if (response.data?.success && response.data?.data?.codeword) {
        const remoteCodeword = response.data.data.codeword;
        console.log("Successfully fetched remote codeword");
        // Store the server-provided codeword locally as a hash only.
        await get().setCodeword(remoteCodeword);
      } else if (response.data?.success && response.data?.data?.codeWord) {
        const remoteCodeword = response.data.data.codeWord;
        console.log("Successfully fetched remote codeWord");
        // Store the server-provided codeword locally as a hash only.
        await get().setCodeword(remoteCodeword);
      } else {
        console.warn(
          "Codeword sync response did not contain codeWord/codeword field",
        );
      }
    } catch (e) {
      console.error("Failed to sync codeword from server", e);
    }
  },
}));
