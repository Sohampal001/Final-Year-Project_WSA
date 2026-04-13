import { useEffect, useRef } from "react";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { useSafetyStore } from "../store/useSafetyStore";
import {
  triggerNotification,
  stopBackgroundListener,
  startBackgroundListener,
  startForegroundListener,
  stopForegroundListener,
  getSpeechRecognitionOptions,
} from "../services/audioListenerService";

export const useGlobalAudioListener = (triggerSos: () => Promise<void>) => {
  const isBackgroundListening = useSafetyStore(
    (state) => state.isBackgroundListening,
  );
  const verifyCodeword = useSafetyStore((state) => state.verifyCodeword);
  const isProcessingSos = useRef(false);
  const matchTimestamps = useRef<number[]>([]);
  const lastMatchedSignature = useRef<string>("");
  const lastMatchedAt = useRef<number>(0);
  const knownCodewordPhrase = useRef<string | null>(null);

  const containsPhrase = (words: string[], phraseWords: string[]) => {
    if (phraseWords.length === 0 || words.length < phraseWords.length) {
      return false;
    }

    for (let i = 0; i <= words.length - phraseWords.length; i++) {
      let isSame = true;
      for (let j = 0; j < phraseWords.length; j++) {
        if (words[i + j] !== phraseWords[j]) {
          isSame = false;
          break;
        }
      }
      if (isSame) return true;
    }

    return false;
  };

  // Start the foreground listener for the active app session.
  useEffect(() => {
    startForegroundListener();
    return () => {
      stopForegroundListener();
    };
  }, []);

  // Manage the Android foreground service when the background toggle changes.
  useEffect(() => {
    if (isBackgroundListening) {
      startBackgroundListener();
    } else {
      stopBackgroundListener();
    }

    return () => {
      stopBackgroundListener();
    };
  }, [isBackgroundListening]);

  // Handle speech results
  useSpeechRecognitionEvent("result", async (event: any) => {
    const results = event.results;
    if (!results || results.length === 0) return;

    const transcript = String(results[0].transcript || "").toLowerCase();

    console.log("[AudioListener] Transcript:", transcript);
    const words = transcript
      .split(/\s+/)
      .map((word: string) => word.replace(/[^\w]/gi, ""))
      .filter(Boolean);
    console.log("[AudioListener] Transcript words:", words);

    const normalizedTranscript = words.join(" ");
    let isMatch = false;
    let matchedSignature = "";

    // Fast path: once discovered, match this phrase in any longer transcript.
    if (knownCodewordPhrase.current) {
      const phraseWords = knownCodewordPhrase.current.split(" ");
      if (containsPhrase(words, phraseWords)) {
        isMatch = true;
        matchedSignature = knownCodewordPhrase.current;
      }
    }

    // Discovery path: find the phrase once and cache it.
    if (
      !isMatch &&
      normalizedTranscript &&
      verifyCodeword(normalizedTranscript)
    ) {
      knownCodewordPhrase.current = normalizedTranscript;
      isMatch = true;
      matchedSignature = normalizedTranscript;
    }

    if (!isMatch) {
      const maxNgramSize = Math.min(4, words.length);
      for (let size = maxNgramSize; size >= 1 && !isMatch; size--) {
        for (let i = 0; i + size <= words.length; i++) {
          const candidate = words.slice(i, i + size).join(" ");
          if (verifyCodeword(candidate)) {
            knownCodewordPhrase.current = candidate;
            isMatch = true;
            matchedSignature = candidate;
            break;
          }
        }
      }
    }

    if (!isMatch) return;

    const now = Date.now();

    // Prevent duplicate counting from rapid interim duplicate events.
    if (
      matchedSignature === lastMatchedSignature.current &&
      now - lastMatchedAt.current < 800
    ) {
      return;
    }

    lastMatchedSignature.current = matchedSignature;
    lastMatchedAt.current = now;

    matchTimestamps.current.push(now);

    // Keep only matches from last 5 seconds.
    const cutoff = now - 5000;
    matchTimestamps.current = matchTimestamps.current.filter(
      (timestamp) => timestamp >= cutoff,
    );

    const matchCount = matchTimestamps.current.length;

    console.log(
      `[AudioListener] Codeword matched ${matchCount}/3 in last 5 seconds.`,
    );

    if (matchCount >= 3) {
      console.log(
        "🚨 CODEWORD DETECTED 3 TIMES IN 5 SECONDS! Triggering SOS... 🚨",
      );

      if (isProcessingSos.current) {
        console.log("Already processing SOS. Cooldown active.");
        return;
      }

      isProcessingSos.current = true;
      triggerNotification(
        "SOS Activated!",
        "Voice trigger detected. Sending emergency alerts.",
      );

      try {
        await triggerSos();
        console.log("✅ Voice SOS trigger completed successfully");
        triggerNotification(
          "SOS Sent Successfully",
          "Your emergency contacts have been notified with your location.",
        );
      } catch (e) {
        console.error("❌ Voice SOS trigger failed:", e);
        triggerNotification(
          "Background SOS Error",
          "We couldn't instantly send the alert. It is queued locally and will retry offline.",
        );
      } finally {
        // Reset state and cooldown for next trigger
        setTimeout(() => {
          console.log("🔄 Resetting SOS state for next trigger...");
          isProcessingSos.current = false;
          matchTimestamps.current = [];
          lastMatchedSignature.current = "";
          lastMatchedAt.current = 0;
          knownCodewordPhrase.current = null; // Reset phrase cache to allow re-discovery

          // Restart speech recognition if still active
          console.log("🎤 Restarting speech recognition...");
          try {
            ExpoSpeechRecognitionModule.start(getSpeechRecognitionOptions());
          } catch (e: any) {
            console.error("Failed to restart recognition:", e);
            // Retry after a delay
            setTimeout(() => {
              try {
                ExpoSpeechRecognitionModule.start(
                  getSpeechRecognitionOptions(),
                );
              } catch (err: any) {
                console.error("Final restart attempt failed:", err);
              }
            }, 1000);
          }
        }, 5000);
      }
    }
  });

  useSpeechRecognitionEvent("end", () => {
    // Keep recognition alive while app listener is active.
    console.log(
      `[AudioListener] End event fired. isProcessingSos=${isProcessingSos.current}`,
    );

    if (!isProcessingSos.current) {
      // Small timeout to prevent aggressive loop
      setTimeout(() => {
        console.log(
          "[AudioListener] Restarting recognition after end event...",
        );
        try {
          ExpoSpeechRecognitionModule.start(getSpeechRecognitionOptions());
        } catch (e: any) {
          console.error("[AudioListener] Failed to restart after end:", e);
        }
      }, 500);
    } else {
      console.log(
        "[AudioListener] SOS processing active - will restart after cooldown",
      );
    }
  });

  useSpeechRecognitionEvent("error", (event: any) => {
    console.log("[AudioListener] Speech Error:", event.error);
    // 7 is match error (no speech) - common and can be ignored
    // Restart listening anyway to keep the engine alive
    if (!isProcessingSos.current) {
      setTimeout(() => {
        console.log(
          "[AudioListener] Restarting recognition after error event...",
        );
        try {
          ExpoSpeechRecognitionModule.start(getSpeechRecognitionOptions());
        } catch (e: any) {
          console.error("[AudioListener] Failed to restart after error:", e);
        }
      }, 1000);
    } else {
      console.log(
        "[AudioListener] SOS processing active - skipping restart on error",
      );
    }
  });
};
