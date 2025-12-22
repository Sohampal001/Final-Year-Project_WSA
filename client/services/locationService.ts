import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_TASK_NAME = "background-location-task";
const APP_STATE_KEY = "app_is_in_foreground";

// Get API URL
const getApiUrl = (): string => {
  return process.env.EXPO_PUBLIC_API_URL!;
};

/**
 * Set app state for background task to know if it should call API
 */
export const setAppInForeground = async (
  inForeground: boolean
): Promise<void> => {
  await AsyncStorage.setItem(APP_STATE_KEY, inForeground ? "true" : "false");
  console.log(
    `📱 App state set to: ${inForeground ? "FOREGROUND" : "BACKGROUND"}`
  );
};

/**
 * Check if app is in foreground
 */
const isAppInForeground = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(APP_STATE_KEY);
  return value === "true";
};

/**
 * Send location to backend server
 */
export const sendLocationToServer = async (
  latitude: number,
  longitude: number,
  accuracy?: number | null,
  altitude?: number | null,
  speed?: number | null,
  heading?: number | null,
  timestamp?: number,
  source: "foreground" | "background" = "foreground"
): Promise<{ success: boolean; saved: boolean; distance?: number }> => {
  const tag = source === "foreground" ? "[Foreground]" : "[Background]";

  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      console.log(`⚠️ ${tag} No auth token - skipping server update`);
      return { success: false, saved: false };
    }

    const apiUrl = getApiUrl();

    const response = await fetch(`${apiUrl}/location/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        altitude: altitude ?? undefined,
        speed: speed ?? undefined,
        heading: heading ?? undefined,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      }),
    });

    if (!response.ok) {
      console.error(`❌ ${tag} Server update failed:`, response.status);
      return { success: false, saved: false };
    }

    const data = await response.json();
    const distance = data.data?.distanceFromPrevious;
    const saved = data.data?.location ? true : false;

    if (saved) {
      console.log(
        `✅ ${tag} Location saved on server (distance: ${distance?.toFixed(
          2
        )}m)`
      );
    } else if (data.success) {
      console.log(
        `📍 ${tag} Location not saved - distance too small (${distance?.toFixed(
          2
        )}m < 5m)`
      );
    }

    return {
      success: data.success,
      saved,
      distance,
    };
  } catch (error) {
    console.error(`❌ ${tag} Failed to send to server:`, error);
    return { success: false, saved: false };
  }
};

export const askLocationPermission = async (): Promise<boolean> => {
  console.log("📍 Requesting location permissions...");

  const { status } = await Location.requestForegroundPermissionsAsync();
  console.log("📍 Foreground permission:", status);

  if (status !== "granted") {
    console.warn("⚠️ Foreground location permission denied");
    return false;
  }

  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  console.log("📍 Background permission:", backgroundStatus);

  if (backgroundStatus !== "granted") {
    console.warn("⚠️ Background location permission denied");
  }

  return status === "granted" && backgroundStatus === "granted";
};

export const checkIfLocationEnabled = async (): Promise<boolean> => {
  const enabled = await Location.hasServicesEnabledAsync();
  console.log("📍 Location services enabled:", enabled);
  return enabled;
};

export const watchUserLocation = async (
  callback: (location: Location.LocationObject) => void
): Promise<Location.LocationSubscription> => {
  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0,
      timeInterval: 1000,
    },
    async (location) => {
      console.log("📍 [Foreground] Location update:", {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Call the callback for local state updates
      callback(location);

      // Send to server from foreground
      await sendLocationToServer(
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy,
        location.coords.altitude,
        location.coords.speed,
        location.coords.heading,
        location.timestamp,
        "foreground"
      );
    }
  );
};

// Define background location task - THIS RUNS WHEN APP IS IN BACKGROUND
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("❌ [Background] Location task error:", error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    // Check if app is in foreground - if so, skip API call (foreground handles it)
    const inForeground = await isAppInForeground();
    if (inForeground) {
      console.log(
        "📍 [Background] App is in foreground - skipping API call (foreground handles it)"
      );
      return;
    }

    console.log(
      `📍 [Background] Processing ${locations.length} location update(s)`
    );

    // Process only the latest location to avoid duplicate calls
    const location = locations[locations.length - 1];
    console.log("📍 [Background] Location update:", {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      accuracy: location.coords.accuracy,
    });

    // Send location to backend server
    try {
      await sendLocationToServer(
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy,
        location.coords.altitude,
        location.coords.speed,
        location.coords.heading,
        location.timestamp,
        "background"
      );
    } catch (err) {
      console.error("❌ [Background] Failed to send location:", err);
    }
  }
});

export const startBackgroundLocationUpdates = async (): Promise<boolean> => {
  try {
    console.log("📍 [Background] Checking permissions...");

    const { status: foregroundStatus } =
      await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } =
      await Location.getBackgroundPermissionsAsync();

    console.log(
      `📍 [Background] Permissions - Foreground: ${foregroundStatus}, Background: ${backgroundStatus}`
    );

    if (foregroundStatus !== "granted" || backgroundStatus !== "granted") {
      console.warn("⚠️ [Background] Location permissions not granted");
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TASK_NAME
    );

    if (!isRegistered) {
      console.log("📍 [Background] Registering location task...");
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // Every 10 seconds (more reliable for background)
        distanceInterval: 5, // Or every 5 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Suraksha Safety Monitoring",
          notificationBody: "Location tracking active for your safety",
          notificationColor: "#06b6d4",
        },
        // Prevent Android from killing the task
        pausesUpdatesAutomatically: false,
        // iOS specific - keeps task alive longer
        activityType: Location.ActivityType.Other,
        // Deferred updates for better battery
        deferredUpdatesInterval: 5000,
        deferredUpdatesDistance: 0,
      });
      console.log("✅ [Background] Location task registered successfully");
    } else {
      console.log("✅ [Background] Location task already registered");
    }

    return true;
  } catch (error) {
    console.error("❌ [Background] Failed to start location updates:", error);
    return false;
  }
};

export const stopBackgroundLocationUpdates = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TASK_NAME
    );
    if (isRegistered) {
      console.log("🛑 [Background] Stopping location task...");
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("✅ [Background] Location task stopped");
    }
  } catch (error) {
    console.error("❌ [Background] Failed to stop location updates:", error);
  }
};

/**
 * Check if background location task is currently running
 */
export const isBackgroundLocationRunning = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
};
