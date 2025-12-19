// app/_layout.tsx
// @ts-nocheck
import LocationProvider from "../providers/LocationProvider";
import { useLocationStore } from "../store/useLocationStore";
import { Stack } from "expo-router";
import "expo-router/entry";
import { useEffect } from "react";

export default function RootLayout() {
  const location = useLocationStore();
  useEffect(() => {
    // console.log("Location : ", location.location);
  }, [location]);
  return (
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
  );
}
