import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface User {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  roles: string[];
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isAadhaarVerified: boolean;
  setTrustedContacts: boolean;
  aadhaarNumber?: string;
  homeAddress?: string;
  workAddress?: string;
}

interface TrustedContact {
  _id: string;
  userId: string;
  name: string;
  mobile: string;
  relationship: string;
  isGuardian: boolean;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  trustedContacts: TrustedContact[] | null;
  trustedContactsLoading: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  setTrustedContacts: (contacts: TrustedContact[]) => void;
  addTrustedContact: (contact: TrustedContact) => void;
  removeTrustedContact: (contactId: string) => void;
  fetchTrustedContacts: (forceRefresh?: boolean) => Promise<void>;
}

const API_BASE_URL = "https://bntjhcxw-3000.inc1.devtunnels.ms/api";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  trustedContacts: null,
  trustedContactsLoading: false,

  setAuth: async (user, token) => {
    try {
      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("userId", user._id);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error saving auth:", error);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("trustedContacts");

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        trustedContacts: null,
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  },

  loadAuth: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const userString = await AsyncStorage.getItem("user");
      const trustedContactsString = await AsyncStorage.getItem(
        "trustedContacts"
      );

      if (token && userString) {
        const user = JSON.parse(userString);
        const trustedContacts = trustedContactsString
          ? JSON.parse(trustedContactsString)
          : null;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          trustedContacts,
        });
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          trustedContacts: null,
        });
      }
    } catch (error) {
      console.error("Error loading auth:", error);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        trustedContacts: null,
      });
    }
  },

  updateUser: (userData) => {
    set((state) => {
      if (state.user) {
        const updatedUser = { ...state.user, ...userData };
        AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        return { user: updatedUser };
      }
      return state;
    });
  },

  setTrustedContacts: async (contacts) => {
    try {
      if (contacts && contacts.length > 0) {
        await AsyncStorage.setItem("trustedContacts", JSON.stringify(contacts));
      } else {
        await AsyncStorage.removeItem("trustedContacts");
      }
      set({ trustedContacts: contacts });
    } catch (error) {
      console.error("Error saving trusted contacts:", error);
    }
  },

  addTrustedContact: (contact) => {
    set((state) => {
      const updatedContacts = state.trustedContacts
        ? [...state.trustedContacts, contact]
        : [contact];
      AsyncStorage.setItem("trustedContacts", JSON.stringify(updatedContacts));
      return { trustedContacts: updatedContacts };
    });
  },

  removeTrustedContact: (contactId) => {
    set((state) => {
      if (state.trustedContacts) {
        const updatedContacts = state.trustedContacts.filter(
          (c) => c._id !== contactId
        );

        // Handle AsyncStorage properly for empty arrays
        if (updatedContacts.length > 0) {
          AsyncStorage.setItem(
            "trustedContacts",
            JSON.stringify(updatedContacts)
          );
        } else {
          AsyncStorage.removeItem("trustedContacts");
        }

        return { trustedContacts: updatedContacts };
      }
      return state;
    });
  },

  fetchTrustedContacts: async (forceRefresh = false) => {
    const { token, trustedContacts } = get();

    if (!token) {
      console.error("No auth token available");
      return;
    }

    // Step 1: Check global state (Zustand store)
    if (trustedContacts !== null && !forceRefresh) {
      console.log("Using trusted contacts from global state");
      return;
    }

    set({ trustedContactsLoading: true });

    try {
      // Step 2: Try to load from AsyncStorage (localStorage)
      if (!forceRefresh) {
        const storedContacts = await AsyncStorage.getItem("trustedContacts");
        if (storedContacts) {
          const parsedContacts = JSON.parse(storedContacts);
          console.log("Loaded trusted contacts from AsyncStorage");
          set({
            trustedContacts: parsedContacts,
            trustedContactsLoading: false,
          });
          return;
        }
      }

      // Step 3: Fetch from API if not in storage or force refresh
      console.log("Fetching trusted contacts from API");
      const response = await apiClient.get("/trusted-contacts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response.data);

      if (response.data.success) {
        // API returns contacts directly in response.data.data (which is an array)
        const contacts = response.data.data || [];

        // Store in AsyncStorage (localStorage)
        if (contacts.length > 0) {
          await AsyncStorage.setItem(
            "trustedContacts",
            JSON.stringify(contacts)
          );
        } else {
          await AsyncStorage.removeItem("trustedContacts");
        }

        // Store in global state
        set({
          trustedContacts: contacts,
          trustedContactsLoading: false,
        });
      } else {
        console.error(
          "Failed to fetch trusted contacts:",
          response.data.message
        );
        set({
          trustedContacts: [],
          trustedContactsLoading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching trusted contacts:", error);
      set({
        trustedContacts: [],
        trustedContactsLoading: false,
      });
    }
  },
}));
