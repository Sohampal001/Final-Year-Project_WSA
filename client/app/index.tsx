// app/index.tsx
// @ts-nocheck
import { Redirect } from "expo-router";
import { useAuthStore } from "../store/useAuthStore";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  // Redirect based on auth status
  if (isAuthenticated) {
    // If user hasn't set trusted contacts, redirect to contact screen
    if (user && !user.setTrustedContacts) {
      return <Redirect href="/(tabs)/contact" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
});
