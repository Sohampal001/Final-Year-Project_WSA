import { ReactNode, useEffect, useRef } from "react";
import {
  askLocationPermission,
  checkIfLocationEnabled,
  watchUserLocation,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
} from "../services/locationService";
import { useLocationStore } from "../store/useLocationStore";
import { updateLocationOnServer } from "../api/locationApi";
import { useAuthStore } from "../store/useAuthStore";
import * as Location from "expo-location";

interface LocationProviderProps {
  children: ReactNode;
}

export default function LocationProvider({ children }: LocationProviderProps) {
  const setLocation = useLocationStore((s) => s.setLocation);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log("🚀 Initializing location services...");

      const gpsEnabled = await checkIfLocationEnabled();
      if (!gpsEnabled) {
        console.warn("⚠️ GPS is disabled - please enable location services");
        return;
      }

      const granted = await askLocationPermission();
      if (!granted) {
        console.warn("⚠️ Location permissions not fully granted");
        return;
      }

      console.log("✅ Location permissions granted");

      // Start background location tracking
      const backgroundStarted = await startBackgroundLocationUpdates();
      if (backgroundStarted) {
        console.log("✅ Background location tracking started");
      }

      // Watch location in foreground
      if (!mounted) return;

      watchSubscription.current = await watchUserLocation(async (pos) => {
        if (!mounted) return;

        const locationData = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        // Update local state
        setLocation(locationData);

        // Send location to server if user is authenticated
        if (isAuthenticated) {
          try {
            const result = await updateLocationOnServer({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
              altitude: pos.coords.altitude ?? undefined,
              speed: pos.coords.speed ?? undefined,
              heading: pos.coords.heading ?? undefined,
              timestamp: new Date(pos.timestamp),
            });

            if (result.saved) {
              console.log(
                `✅ Location saved on server (distance: ${result.distance}m)`
              );
            } else if (result.success) {
              console.log(
                `📍 Location not saved - distance too small (${result.distance}m < 5m)`
              );
            }
          } catch (error) {
            console.error("❌ Failed to update location on server:", error);
          }
        }
      });

      console.log("✅ Location provider initialized");
    };

    init();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up location services...");
      mounted = false;

      if (watchSubscription.current) {
        watchSubscription.current.remove();
        console.log("✅ Location watch subscription removed");
      }

      // Note: We don't stop background location on unmount
      // as we want it to continue running for safety
    };
  }, [isAuthenticated, setLocation]);

  return <>{children}</>;
}
