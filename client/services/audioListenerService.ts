import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { Platform, DeviceEventEmitter } from "react-native";
import { triggerGlobalSos } from "./sosOrchestrator";
import * as Notifications from "expo-notifications";

let isRecognitionActive = false;
let isForegroundServiceActive = false;
let serviceEndSubscription: any = null;
let serviceErrorSubscription: any = null;
let sosButtonSubscription: any = null;
let isSosProcessing = false;
let pendingRestartTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Single-source restart scheduling ─────────────────────────────────────────
// "end", "error" and the health-check task can all observe a dead engine at
// nearly the same time. Without this, each would schedule its own restart and
// the resulting overlapping start() calls fight each other, so the codeword
// listener keeps dropping instead of staying on continuously.

const scheduleRestart = (delay: number) => {
  if (pendingRestartTimer) {
    clearTimeout(pendingRestartTimer);
  }
  pendingRestartTimer = setTimeout(() => {
    pendingRestartTimer = null;
    if (isRecognitionActive && !isSosProcessing) {
      startRecording().catch((e) =>
        console.log("[Service] Scheduled restart failed:", e),
      );
    }
  }, delay);
};

// ─── SOS processing flag ──────────────────────────────────────────────────────

export const setServiceSosProcessing = (value: boolean) => {
  isSosProcessing = value;
};

export const getIsSosProcessing = (): boolean => isSosProcessing;

// ─── Speech recognition options ───────────────────────────────────────────────

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

// ─── Service-level native listeners ─────────────────────────────────────────
// These survive background — no React dependency.

const attachServiceListeners = () => {
  if (serviceEndSubscription || serviceErrorSubscription) return;

  serviceEndSubscription = ExpoSpeechRecognitionModule.addListener(
    "end",
    () => {
      if (!isRecognitionActive || isSosProcessing) return;
      scheduleRestart(500);
    },
  );

  serviceErrorSubscription = ExpoSpeechRecognitionModule.addListener(
    "error",
    () => {
      if (!isRecognitionActive || isSosProcessing) return;
      scheduleRestart(1000);
    },
  );
};

const detachServiceListeners = () => {
  serviceEndSubscription?.remove();
  serviceEndSubscription = null;
  serviceErrorSubscription?.remove();
  serviceErrorSubscription = null;
};

// ─── Foreground listener ──────────────────────────────────────────────────────

export const startForegroundListener = async () => {
  if (!isRecognitionActive) {
    console.log("[AudioService] Starting foreground speech listener...");
    isRecognitionActive = true;
    attachServiceListeners();
    await startRecording();
  }
};

export const stopForegroundListener = () => {
  console.log("[AudioService] Stopping foreground speech listener...");
  isRecognitionActive = false;
  isSosProcessing = false;
  if (pendingRestartTimer) {
    clearTimeout(pendingRestartTimer);
    pendingRestartTimer = null;
  }
  detachServiceListeners();
  ExpoSpeechRecognitionModule.stop();
};

// ─── Android foreground service ───────────────────────────────────────────────

const startAndroidForegroundService = async () => {
  if (Platform.OS !== "android" || isForegroundServiceActive) return;

  if (!sosButtonSubscription) {
    sosButtonSubscription = DeviceEventEmitter.addListener("triggerSOS", () => {
      console.log("[AudioService] SOS triggered from notification button.");
      triggerGlobalSos().catch((e) =>
        console.error("[AudioService] Notification SOS failed:", e),
      );
    });
  }

  try {
    ReactNativeForegroundService.add_task(
      async () => {
        if (!isRecognitionActive || isSosProcessing) return;
        try {
          const state = await ExpoSpeechRecognitionModule.getStateAsync();
          if (state === "inactive") {
            console.log(
              "[AudioService] Health check: engine inactive — restarting.",
            );
            await startRecording();
          }
        } catch (e) {
          console.log("[AudioService] Health check error:", e);
          scheduleRestart(2000);
        }
      },
      {
        delay: 5000,
        onLoop: true,
        taskId: "Raksha_background_audio",
        onError: (e: any) => console.log("[AudioService] Task error:", e),
      },
    );

    ReactNativeForegroundService.start({
      id: 1244,
      title: "Raksha Background Monitoring",
      message: "Listening for your safety codeword.",
      icon: "ic_launcher",
      button: true,
      buttonText: "🚨 Trigger SOS",
      buttonOnPress: "triggerSOS",
      setOnlyAlertOnce: true,
      color: "#dc2626",
      // Required on Android 14+ (API 34+) - lib expects the capitalized
      // "ServiceType" key; "serviceType" is silently ignored and throws
      // "ForegroundService: ServiceType is required".
      ServiceType: "microphone",
    } as any);

    isForegroundServiceActive = true;
    console.log("[AudioService] Foreground service started.");
  } catch (e) {
    console.log("[AudioService] Error starting foreground service:", e);
  }
};

// ─── Background listener ──────────────────────────────────────────────────────

export const startBackgroundListener = async () => {
  console.log("[AudioService] Starting background listener...");
  await startForegroundListener();
  await startAndroidForegroundService();
};

export const stopBackgroundListener = () => {
  console.log("[AudioService] Stopping background listener...");
  if (Platform.OS === "android" && isForegroundServiceActive) {
    ReactNativeForegroundService.remove_task("Raksha_background_audio");
    ReactNativeForegroundService.stop();
    isForegroundServiceActive = false;
  }
  sosButtonSubscription?.remove();
  sosButtonSubscription = null;
  if (isRecognitionActive) {
    stopForegroundListener();
  }
};

// ─── Core recording function ──────────────────────────────────────────────────

export const startRecording = async () => {
  if (!isRecognitionActive) return;

  try {
    // Guard against overlapping start() calls: "end"/"error"/health-check can
    // all reach here around the same time. Starting an already-running engine
    // throws natively and kills the session that WAS working, so bail out.
    const currentState = await ExpoSpeechRecognitionModule.getStateAsync();
    if (currentState !== "inactive") {
      return;
    }

    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!granted) {
      console.warn("[AudioService] Microphone permission not granted.");
      triggerNotification(
        "Permissions Missing",
        "Microphone access is needed for voice SOS trigger.",
      );
      stopForegroundListener();
      stopBackgroundListener();
      return;
    }

    console.log("[AudioService] Starting voice recognition engine...");
    await ExpoSpeechRecognitionModule.start(getSpeechRecognitionOptions());
  } catch (error) {
    console.log("[AudioService] Error starting voice recognition:", error);
    triggerNotification(
      "Speech Engine Error",
      "The background listener encountered a failure. Automatically restarting...",
    );
    scheduleRestart(3000);
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

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
