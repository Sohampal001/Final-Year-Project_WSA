import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Platform, DeviceEventEmitter } from "react-native";
import { triggerGlobalSos } from "./sosOrchestrator";
import * as Notifications from "expo-notifications";

// Separate state for the speech engine and the Android foreground service.
let isRecognitionActive = false;
let isForegroundServiceActive = false;

export const getSpeechRecognitionOptions = () => ({
  lang: "en-US",
  interimResults: true,
  maxAlternatives: 1,
  continuous: true,
  androidIntentOptions: {
    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 100000,
    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 100000,
    EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 100000,
  },
});

export const startForegroundListener = async () => {
  if (!isRecognitionActive) {
    console.log("Starting foreground speech listener...");
    isRecognitionActive = true;
    await startRecording();
  }
};

export const stopForegroundListener = () => {
  console.log("Stopping foreground speech listener...");
  isRecognitionActive = false;
  ExpoSpeechRecognitionModule.stop();
};

const startAndroidForegroundService = async () => {
  if (Platform.OS !== "android" || isForegroundServiceActive) return;

  DeviceEventEmitter.addListener("triggerSOS", () => {
    console.log("SOS triggered from Background Notification!");
    triggerGlobalSos().catch((e) =>
      console.error("Notification SOS failed", e),
    );
  });

  try {
    ReactNativeForegroundService.add_task(
      async () => {
        if (isRecognitionActive) {
          try {
            const state = await ExpoSpeechRecognitionModule.getStateAsync();
            if (state === "inactive") {
              console.log(
                "🎤 [Health Check] Speech engine stopped. Restarting...",
              );
              await startRecording();
            }
          } catch (e) {
            console.log("🔧 [Health Check] Error checking state:", e);
            // Try to restart anyway
            setTimeout(() => {
              if (isRecognitionActive) {
                startRecording().catch((e) =>
                  console.log("Health check restart failed:", e),
                );
              }
            }, 2000);
          }
        }
      },
      {
        delay: 5000,
        onLoop: true,
        taskId: "Aegis_background_audio",
        onError: (e: any) => console.log("🔧 [Health Check] Error logging:", e),
      },
    );

    ReactNativeForegroundService.start({
      id: 1244,
      title: "Aegis Background Monitoring",
      message: "Listening for your safety codeword.",
      icon: "ic_launcher",
      button: true,
      buttonText: "🚨 Trigger SOS",
      buttonOnPress: "triggerSOS",
      setOnlyAlertOnce: true,
      color: "#dc2626",
    } as any);
    isForegroundServiceActive = true;
    console.log("Foreground service configured and started.");
  } catch (e) {
    console.log("Error starting foreground service", e);
  }
};

export const startBackgroundListener = async () => {
  console.log("Starting background listener flow...");
  await startForegroundListener();
  await startAndroidForegroundService();
};

export const stopBackgroundListener = () => {
  console.log("Stopping Background Listener...");
  if (Platform.OS === "android") {
    if (isForegroundServiceActive) {
      ReactNativeForegroundService.remove_task("Aegis_background_audio");
      ReactNativeForegroundService.stop();
      isForegroundServiceActive = false;
    }
  }
  // Also reset the foreground listener if it's still running
  if (isRecognitionActive) {
    stopForegroundListener();
  }
};

const startRecording = async () => {
  if (!isRecognitionActive) return;

  try {
    // Only request microphone permissions if we're actually in background listening mode
    // This prevents unnecessary permission prompts in normal operation
    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!granted) {
      console.warn("⚠️ Microphone permission not granted!");
      // Show notification to user
      triggerNotification(
        "Permissions Missing",
        "Microphone access is needed for voice SOS trigger.",
      );
      stopForegroundListener();
      stopBackgroundListener();
      return;
    }
    console.log("✅ Microphone permission granted");

    console.log("Starting voice recognition engine...");

    // We want listening in a loop. When speech ends, restart it
    await ExpoSpeechRecognitionModule.start(getSpeechRecognitionOptions());
  } catch (error) {
    console.log("Error starting voice recognition:", error);
    triggerNotification(
      "Speech Engine Error",
      "The background listener encountered a failure. Automatically restarting...",
    );
    // Exponential backoff or restart on error
    setTimeout(() => startRecording(), 3000);
  }
};

// Function for sending local notifications
export const triggerNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { action: "sos_alert" },
    },
    trigger: null,
  });
};

// We will export a hook for components that need to listen to speech events,
// or set up a global event listener. expo-speech-recognition uses hooks primarily.
