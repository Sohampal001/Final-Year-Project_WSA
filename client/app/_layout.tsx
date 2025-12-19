// app/_layout.tsx
// @ts-nocheck
import LocationProvider from "../providers/LocationProvider";
import LocationPermissionGuard from "../components/LocationPermissionGuard";
import { useAuthStore } from "../store/useAuthStore";
import { Stack } from "expo-router";
import "expo-router/entry";
import { useEffect } from "react";

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const fetchTrustedContacts = useAuthStore(
    (state) => state.fetchTrustedContacts
  );
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Load auth state on app start
    const initializeApp = async () => {
      await loadAuth();
    };
    initializeApp();
  }, [loadAuth]);

  // Fetch trusted contacts after auth is loaded
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrustedContacts();
    }
  }, [isAuthenticated, fetchTrustedContacts]);

  return (
    <LocationPermissionGuard>
      <LocationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* First screen when app opens */}
          <Stack.Screen name="index" />

          {/* Auth screens */}
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />

          {/* Tabs group */}
          <Stack.Screen name="(tabs)" />
        </Stack>
      </LocationProvider>
    </LocationPermissionGuard>
  );
}
