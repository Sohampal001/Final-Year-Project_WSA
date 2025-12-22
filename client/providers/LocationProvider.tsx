import { ReactNode, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  askLocationPermission,
  checkIfLocationEnabled,
  watchUserLocation,
  startBackgroundLocationUpdates,
  setAppInForeground,
} from "../services/locationService";
import { useLocationStore } from "../store/useLocationStore";
import { useAuthStore } from "../store/useAuthStore";
import * as Location from "expo-location";

interface LocationProviderProps {
  children: ReactNode;
}

export default function LocationProvider({ children }: LocationProviderProps) {
  const setLocation = useLocationStore((s) => s.setLocation);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;

    /**
     * Start foreground location watching
     */
    const startForegroundTracking = async () => {
      if (watchSubscription.current) {
        console.log("📍 [Foreground] Already watching, skipping...");
        return;
      }

      // Set app state to foreground - background task will skip API calls
      await setAppInForeground(true);

      console.log("📍 [Foreground] Starting location watch...");
      watchSubscription.current = await watchUserLocation((pos) => {
        if (!mounted) return;

        // Update local state only - server update is handled in locationService
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      });
      console.log("✅ [Foreground] Location watch started");
    };

    /**
     * Stop foreground location watching and enable background API calls
     */
    const stopForegroundTracking = async () => {
      if (watchSubscription.current) {
        console.log("🛑 [Foreground] Stopping location watch...");
        watchSubscription.current.remove();
        watchSubscription.current = null;
        console.log("✅ [Foreground] Location watch stopped");
      }

      // Set app state to background - background task will now call API
      await setAppInForeground(false);
      console.log("✅ [Background] Background task will now handle API calls");
    };

    /**
     * Handle app state changes (foreground/background)
     */
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(
        `📱 App state changed: ${appState.current} -> ${nextAppState}`
      );

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to FOREGROUND
        console.log("🔄 App came to FOREGROUND");
        await startForegroundTracking();
      } else if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to BACKGROUND
        console.log("🔄 App went to BACKGROUND");
        await stopForegroundTracking();
      }

      appState.current = nextAppState;
    };

    /**
     * Initialize location services
     */
    const init = async () => {
      if (isInitialized.current) {
        console.log("📍 Already initialized, skipping...");
        return;
      }

      console.log("🚀 Initializing location services...");

      // Check if GPS is enabled
      const gpsEnabled = await checkIfLocationEnabled();
      if (!gpsEnabled) {
        console.warn("⚠️ GPS is disabled - please enable location services");
        return;
      }

      // Request permissions
      const granted = await askLocationPermission();
      if (!granted) {
        console.warn("⚠️ Location permissions not fully granted");
        return;
      }

      console.log("✅ Location permissions granted");

      // Start background location task FIRST (while app is in foreground)
      // This must be done before app goes to background on Android
      const backgroundStarted = await startBackgroundLocationUpdates();
      if (backgroundStarted) {
        console.log("✅ Background location task registered");
      } else {
        console.warn("⚠️ Failed to register background location task");
      }

      // Start foreground tracking if app is active
      if (!mounted) return;

      if (AppState.currentState === "active") {
        await startForegroundTracking();
      } else {
        // App started in background
        await setAppInForeground(false);
      }

      isInitialized.current = true;
      console.log("✅ Location provider fully initialized");
    };

    // Initialize
    init();

    // Subscribe to app state changes
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up location provider...");
      mounted = false;

      // Remove app state listener
      subscription.remove();

      // Stop foreground tracking
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }

      // Note: We do NOT stop background location updates on unmount
      // The background task should continue running for user safety
      console.log(
        "📍 Background location tracking continues running for safety"
      );
    };
  }, [isAuthenticated, setLocation]);

  return <>{children}</>;
}
