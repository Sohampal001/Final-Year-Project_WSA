// components/LocationPermissionGuard.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

interface LocationPermissionGuardProps {
  children: React.ReactNode;
}

export default function LocationPermissionGuard({
  children,
}: LocationPermissionGuardProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkLocationPermission = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsChecking(true);
    }
    try {
      // Check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();

      if (!locationEnabled) {
        setHasPermission(false);
        if (showLoadingState) {
          setIsChecking(false);
        }
        return;
      }

      // Check permission status
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === "granted") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }

      if (showLoadingState) {
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Error checking location permission:", error);
      if (showLoadingState) {
        setIsChecking(false);
      }
      setHasPermission(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      // First check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();

      if (!locationEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services in your device settings to use this app.",
          [
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "android") {
                  Linking.sendIntent(
                    "android.settings.LOCATION_SOURCE_SETTINGS"
                  );
                } else {
                  Linking.openURL("app-settings:");
                }
              },
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        setHasPermission(true);
      } else if (status === "denied") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for safety features. Please enable it in settings.",
          [
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      Alert.alert(
        "Error",
        "Failed to request location permission. Please try again."
      );
    }
  };

  useEffect(() => {
    // Initial check
    checkLocationPermission();

    // Set up interval to check location status every 3 seconds
    const intervalId = setInterval(() => {
      checkLocationPermission(false); // Don't show loading state for periodic checks
    }, 3000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.checkingText}>
          Checking location permissions...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="location-outline" size={80} color="#14b8a6" />
          </View>

          <Text style={styles.title}>Location Access Required</Text>
          <Text style={styles.subtitle}>
            Suraksha needs access to your location to provide safety features
            and emergency alerts.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
              <Text style={styles.featureText}>Emergency location sharing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
              <Text style={styles.featureText}>Find nearby help centers</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
              <Text style={styles.featureText}>
                Real-time safety monitoring
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.enableButton}
            onPress={requestLocationPermission}
          >
            <Ionicons name="location" size={20} color="#ffffff" />
            <Text style={styles.enableButtonText}>Enable Location Access</Text>
          </TouchableOpacity>

          <Text style={styles.privacyText}>
            Your location data is secure and only used for safety features.
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  checkingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
  },
  permissionCard: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#a5f3fc",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  featuresList: {
    width: "100%",
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    color: "#e5e7eb",
    fontSize: 14,
    marginLeft: 12,
  },
  enableButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14b8a6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  enableButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  privacyText: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});
