import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushToken, removePushToken } from "@/api/sosApi";

// Cache this device's token locally so logout can deregister it from the backend.
const PUSH_TOKEN_KEY = "expoPushToken";

// Foreground presentation: show the banner + list entry and play a sound even
// when the app is open. SDK 54 handler shape (shouldShowBanner/List, not the
// deprecated shouldShowAlert).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SOS_CHANNEL_ID = "sos-alerts";

/**
 * Android requires a high-importance channel for the SOS alerts to break
 * through Do Not Disturb / heads-up. No-op on iOS.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(SOS_CHANNEL_ID, {
      name: "SOS Alerts",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#dc2626",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    console.error("[Push] Failed to create Android channel:", error);
  }
}

/**
 * Ensure the channel exists, request permissions, obtain the Expo push token
 * and register it with the backend. Returns the token string, or null on any
 * failure/denial. Must NEVER crash the app — FCM may be unconfigured in dev.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    await ensureAndroidChannel();

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Push] Notification permission not granted.");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    if (token?.data) {
      await registerPushToken(token.data);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
      return token.data;
    }

    return null;
  } catch (error) {
    console.error("[Push] Failed to register for push notifications:", error);
    return null;
  }
}

/**
 * Deregister this device on logout so it stops receiving the user's SOS alerts.
 * Reads the cached token and tells the backend to drop it. Best-effort.
 * MUST be called while the auth token is still present (before it is cleared).
 */
export async function deregisterPushNotifications(): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (cached) {
      await removePushToken(cached);
    }
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error("[Push] Failed to deregister push notifications:", error);
  }
}
