import { useEffect, useRef } from "react";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useSafetyStore } from "../store/useSafetyStore";
import {
  triggerNotification,
  stopBackgroundListener,
  startBackgroundListener,
  startForegroundListener,
  stopForegroundListener,
  startRecording,
  setServiceSosProcessing,
  getIsSosProcessing,
} from "../services/audioListenerService";
import { isRecordingSurroundings } from "../services/sosAudioService";

export const useGlobalAudioListener = (triggerSos: () => Promise<void>) => {
  const isBackgroundListening = useSafetyStore(
    (state) => state.isBackgroundListening,
  );
  const verifyCodeword = useSafetyStore((state) => state.verifyCodeword);

  // Local refs for codeword matching logic
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

  // Start the foreground listener when the component mounts.
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

  // ─── Speech result handler ────────────────────────────────────────────────

  useSpeechRecognitionEvent("result", async (event: any) => {
    // Feature 2: block codeword detection while surroundings are being recorded
    if (isRecordingSurroundings()) {
      console.log(
        "[AudioListener] Surroundings recording active — ignoring transcript.",
      );
      return;
    }

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

    // Fast path: re-use cached phrase.
    if (knownCodewordPhrase.current) {
      const phraseWords = knownCodewordPhrase.current.split(" ");
      if (containsPhrase(words, phraseWords)) {
        isMatch = true;
        matchedSignature = knownCodewordPhrase.current;
      }
    }

    // Discovery path.
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

    // Debounce rapid interim duplicates.
    if (
      matchedSignature === lastMatchedSignature.current &&
      now - lastMatchedAt.current < 800
    ) {
      return;
    }

    lastMatchedSignature.current = matchedSignature;
    lastMatchedAt.current = now;
    matchTimestamps.current.push(now);

    // Keep only matches from the last 5 seconds.
    const cutoff = now - 5000;
    matchTimestamps.current = matchTimestamps.current.filter(
      (ts) => ts >= cutoff,
    );

    const matchCount = matchTimestamps.current.length;
    console.log(
      `[AudioListener] Codeword matched ${matchCount}/3 in last 5 seconds.`,
    );

    if (matchCount < 3) return;

    // Guard: only one SOS at a time.
    if (getIsSosProcessing()) {
      console.log("[AudioListener] Already processing SOS. Cooldown active.");
      return;
    }

    console.log(
      "🚨 CODEWORD DETECTED 3 TIMES IN 5 SECONDS! Triggering SOS... 🚨",
    );

    // Raise the flag in the service layer so the health-check loop and the
    // end/error handlers both know not to restart the engine mid-SOS.
    setServiceSosProcessing(true);

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
      // After the cooldown, clear the flag and let the service restart the engine.
      setTimeout(() => {
        console.log("🔄 Resetting SOS state for next trigger...");

        // Reset local codeword matching state.
        matchTimestamps.current = [];
        lastMatchedSignature.current = "";
        lastMatchedAt.current = 0;
        knownCodewordPhrase.current = null;

        // Lower the flag BEFORE scheduling the restart so the service layer
        // is ready to accept it — covers both foreground and background paths.
        setServiceSosProcessing(false);

        console.log("🎤 Restarting speech recognition after SOS cooldown...");
        startRecording().catch((e: any) => {
          console.error("Post-SOS restart failed, retrying in 2s:", e);
          setTimeout(() => startRecording(), 2000);
        });
      }, 5000);
    }
  });

  // End / error events: service layer owns all restarts silently.
  useSpeechRecognitionEvent("end", () => {
    // no-op: service-level listeners handle restart
  });

  useSpeechRecognitionEvent("error", (_event: any) => {
    // no-op: service-level listeners handle restart
  });
};
