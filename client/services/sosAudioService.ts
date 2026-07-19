// @ts-nocheck
/**
 * sosAudioService.ts
 *
 * Post-SOS surroundings recording.
 * Call startSurroundingsRecording() fire-and-forget after any SOS dispatch.
 */

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "../store/useAuthStore";
import { useLocationStore } from "../store/useLocationStore";

// ── Duration ────────────────────────────────────────────────────────────────
const RECORDING_DURATION_SECONDS: number = Number(
  process.env.EXPO_PUBLIC_SOS_RECORDING_DURATION_SECONDS ?? 30,
);

// ── Module-level flag ────────────────────────────────────────────────────────
let _isRecording = false;

/** Returns true while a surroundings recording is in-flight. */
export const isRecordingSurroundings = (): boolean => _isRecording;

// ── Notification helper ───────────────────────────────────────────────────────
const notify = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { action: "sos_audio" } },
      trigger: null,
    });
  } catch {
    // notifications are best-effort
  }
};

// ── Main entry ───────────────────────────────────────────────────────────────

export const startSurroundingsRecording = async (
  triggerType: "VOICE" | "BUTTON" = "VOICE",
): Promise<void> => {
  if (_isRecording) {
    return;
  }

  _isRecording = true;

  // Notify user immediately so they know recording is happening
  await notify(
    "🎙️ Recording Surroundings",
    `Recording ${RECORDING_DURATION_SECONDS}s of ambient audio for evidence.`,
  );

  let recordingObj: Audio.Recording | null = null;
  let localUri: string | null = null;

  try {
    // 1. Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    // 2. Start recording
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingObj = recording;

    // 3. Wait for configured duration
    await new Promise<void>((resolve) =>
      setTimeout(resolve, RECORDING_DURATION_SECONDS * 1000),
    );

    // 4. Stop and grab URI
    await recordingObj.stopAndUnloadAsync();
    localUri = recordingObj.getURI() ?? null;
    recordingObj = null;

    if (!localUri) {
      await notify("⚠️ Recording Failed", "Could not capture audio after SOS.");
      return;
    }

    // 5. Unblock voice SOS detection immediately — upload runs in background.
    // The speech engine is already running (restarted at SOS cooldown).
    // We must not hold _isRecording=true while waiting for the server response
    // (risk analysis + email can take 10-90s), as that would block codeword detection.
    _isRecording = false;

    // 6. Upload fire-and-forget — result notification handled inside
    uploadRecording(localUri, triggerType).catch((err) =>
      console.error("[SosAudio] Background upload error:", err),
    );
  } catch (err) {
    console.error("[SosAudio] Recording error:", err);

    if (recordingObj) {
      try {
        await recordingObj.stopAndUnloadAsync();
      } catch {
        // ignore
      }
    }

    await notify(
      "⚠️ SOS Recording Failed",
      "Could not capture or send the audio recording.",
    );
  } finally {
    _isRecording = false;
    // Note: local file deletion is handled inside uploadRecording after the
    // upload completes, so we do NOT delete here — the file is still needed.
  }
};

// ── Upload helper ─────────────────────────────────────────────────────────────

const uploadRecording = async (
  localUri: string,
  triggerType: "VOICE" | "BUTTON",
): Promise<void> => {
  // Always delete the local file when done, regardless of upload outcome
  const cleanup = async () => {
    try {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch {
      // ignore
    }
  };

  const token = useAuthStore.getState().token;
  if (!token) {
    await notify("⚠️ Upload Failed", "Not authenticated — audio not sent.");
    await cleanup();
    return;
  }

  const location = useLocationStore.getState().location;
  const API_URL = process.env.EXPO_PUBLIC_API_URL!;

  const params: Record<string, string> = { triggerType };
  if (location?.lat != null) params.latitude = String(location.lat);
  if (location?.lon != null) params.longitude = String(location.lon);

  try {
    const result = await FileSystem.uploadAsync(
      `${API_URL}/audio/upload`,
      localUri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "audio",
        headers: { Authorization: `Bearer ${token}` },
        parameters: params,
      },
    );

    if (result.status >= 200 && result.status < 300) {
      let riskInfo = "";
      try {
        const body = JSON.parse(result.body);
        const risk = body?.data?.riskAnalysis;
        if (risk?.risk_level) {
          riskInfo = ` Risk level: ${risk.risk_level}.`;
        }
      } catch {
        // non-fatal
      }

      await notify(
        "✅ Audio Evidence Sent",
        `${RECORDING_DURATION_SECONDS}s recording uploaded to server.${riskInfo} Your contacts have been notified.`,
      );
    } else {
      console.error("[SosAudio] Upload failed. Status:", result.status);
      await notify(
        "⚠️ Audio Upload Failed",
        `Server returned status ${result.status}. Recording could not be sent.`,
      );
    }
    await cleanup();
  } catch (err) {
    console.error("[SosAudio] Upload error:", err);
    await notify(
      "⚠️ Audio Upload Failed",
      "Network error — recording could not be uploaded.",
    );
    await cleanup();
  }
};
