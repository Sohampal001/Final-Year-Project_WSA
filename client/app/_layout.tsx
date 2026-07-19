// app/_layout.tsx
// @ts-nocheck
import LocationProvider from "../providers/LocationProvider";
import LocationPermissionGuard from "../components/LocationPermissionGuard";
import { useAuthStore } from "../store/useAuthStore";
import { Stack, useRouter } from "expo-router";
import "expo-router/entry";
import { useEffect, useRef } from "react";
import { useGlobalAudioListener } from "../hooks/useGlobalAudioListener";
import { triggerGlobalSos } from "../services/sosOrchestrator";
import { useSafetyStore } from "../store/useSafetyStore";
import { useLocationStore } from "../store/useLocationStore";
import { useHomeBootstrapStore } from "../store/useHomeBootstrapStore";
import { registerForPushNotifications } from "../services/pushNotificationService";
import * as Notifications from "expo-notifications";

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const fetchTrustedContacts = useAuthStore(
    (state) => state.fetchTrustedContacts,
  );
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocationStore((state) => state.location);
  const bootstrapHomeData = useHomeBootstrapStore(
    (state) => state.bootstrapHomeData,
  );
  const hasBootstrappedRef = useRef(false);
  const hasRegisteredPushRef = useRef(false);
  const router = useRouter();

  const loadSafetySettings = useSafetyStore(
    (state) => state.loadSafetySettings,
  );

  useGlobalAudioListener(triggerGlobalSos);

  // Route to the SOS alert detail screen for an sos_alert notification payload.
  const routeFromNotification = (data: any) => {
    if (data?.type === "sos_alert" && data?.broadcastId) {
      router.push(`/sos-alert/${data.broadcastId}`);
    }
  };

  // Notification tap routing (warm) + cold-start handling.
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        routeFromNotification(response.notification.request.content.data);
      });

    // COLD START: app launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        routeFromNotification(response.notification.request.content.data);
      }
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Request notification permissions globally
    const configureNotifications = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };

    // Load auth state and safety settings on app start
    const initializeApp = async () => {
      await configureNotifications();
      await loadSafetySettings();
      await loadAuth();
    };
    initializeApp();
  }, [loadAuth, loadSafetySettings]);

  // Fetch trusted contacts after auth is loaded
  useEffect(() => {
    if (isAuthenticated) {
      if (hasBootstrappedRef.current) {
        return;
      }

      hasBootstrappedRef.current = true;
      bootstrapHomeData({
        latitude: location?.lat,
        longitude: location?.lon,
      }).then((ok) => {
        if (!ok) {
          fetchTrustedContacts();
        }
      });

      // Register for push notifications once, after auth is ready.
      if (!hasRegisteredPushRef.current) {
        hasRegisteredPushRef.current = true;
        registerForPushNotifications().catch(() => {});
      }
    } else {
      hasBootstrappedRef.current = false;
      hasRegisteredPushRef.current = false;
    }
  }, [
    isAuthenticated,
    fetchTrustedContacts,
    bootstrapHomeData,
    location?.lat,
    location?.lon,
  ]);

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

          {/* Per-category nearby places (police / hospital / pharmacy / bus stop) */}
          <Stack.Screen name="places/[category]" />

          {/* Incoming SOS broadcast detail (opened from push notification) */}
          <Stack.Screen name="sos-alert/[id]" />
        </Stack>
      </LocationProvider>
    </LocationPermissionGuard>
  );
}
