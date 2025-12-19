// app/(tabs)/_layout.tsx
// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  // Don't render tabs if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="home-outline"
              size={26}
              color={focused ? "#0f766e" : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: "Contact",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="call-outline"
              size={26}
              color={focused ? "#0f766e" : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearest"
        options={{
          title: "Nearest",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="people-outline"
              size={26}
              color={focused ? "#0f766e" : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recording"
        options={{
          title: "Recording",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="mic-outline"
              size={26}
              color={focused ? "#0f766e" : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name="person-outline"
              size={26}
              color={focused ? "#0f766e" : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
});
