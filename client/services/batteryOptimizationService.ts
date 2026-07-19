import { Platform, Linking, Alert } from "react-native";

/**
 * Opens the OS battery-optimization settings screen so the user can
 * whitelist Raksha. Android kills background foreground-services on
 * aggressive OEM battery managers (Xiaomi/Oppo/Vivo/etc.) regardless of
 * how correct the JS-side listener/restart logic is - only an OS-level
 * exemption fixes that, this just gets the user to the right screen.
 */
export const openBatteryOptimizationSettings = async (): Promise<void> => {
  if (Platform.OS !== "android") return;

  try {
    await Linking.sendIntent(
      "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
    );
  } catch (e) {
    console.log(
      "[BatteryOptimization] Settings screen intent failed, falling back:",
      e,
    );
    try {
      await Linking.openSettings();
    } catch {
      // best-effort only
    }
  }
};

/**
 * One-time nudge shown when the user turns background listening on -
 * that's the exact moment the OS-level exemption becomes relevant.
 */
export const promptDisableBatteryOptimization = (): void => {
  if (Platform.OS !== "android") return;

  Alert.alert(
    "Keep Background Listening Reliable",
    'Some phone makers (Xiaomi, Oppo, Vivo, etc.) stop apps running in the background to save battery. To make sure Raksha keeps listening for your codeword when the app is closed or the screen is off, disable battery optimization for Raksha, and if your phone has an "Autostart" or "App battery saver" list, allow Raksha there too.',
    [
      {
        text: "Open Settings",
        onPress: () => {
          openBatteryOptimizationSettings();
        },
      },
      { text: "Later", style: "cancel" },
    ],
  );
};
