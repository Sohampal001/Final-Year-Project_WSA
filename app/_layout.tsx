// app/_layout.tsx
// @ts-nocheck
import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* First screen when app opens */}
      <Stack.Screen name="index" />

      {/* Auth screens */}
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />

      {/* Tabs group */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
