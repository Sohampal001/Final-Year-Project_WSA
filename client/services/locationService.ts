import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const LOCATION_TASK_NAME = "background-location-task";

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
  console.log("📍 Starting location watch...");

  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5, // Update every 5 meters
      timeInterval: 10000, // Update every 10 seconds
    },
    (location) => {
      console.log("📍 Location update:", {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      callback(location);
    }
  );
};

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("❌ Background location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log("📍 Background location update:", locations);
    // The location will be handled by the foreground watcher
  }
});

export const startBackgroundLocationUpdates = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } =
      await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } =
      await Location.getBackgroundPermissionsAsync();

    if (foregroundStatus !== "granted" || backgroundStatus !== "granted") {
      console.warn("⚠️ Background location permissions not granted");
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TASK_NAME
    );

    if (!isRegistered) {
      console.log("📍 Registering background location task...");
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000, // 15 seconds
        distanceInterval: 10, // 10 meters
        foregroundService: {
          notificationTitle: "Suraksha Safety Monitoring",
          notificationBody: "Location tracking active for your safety",
          notificationColor: "#06b6d4",
        },
      });
      console.log("✅ Background location task registered");
    } else {
      console.log("✅ Background location task already registered");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to start background location:", error);
    return false;
  }
};

export const stopBackgroundLocationUpdates = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TASK_NAME
    );
    if (isRegistered) {
      console.log("🛑 Stopping background location task...");
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("✅ Background location task stopped");
    }
  } catch (error) {
    console.error("❌ Failed to stop background location:", error);
  }
};
