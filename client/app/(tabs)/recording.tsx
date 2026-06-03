// app/(tabs)/recording.tsx
// @ts-nocheck
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useAuthStore } from "../../store/useAuthStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskAnalysis {
  originalText: string;
  romanizedText: string;
  translatedText: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  score: number;
}

interface AudioRecording {
  _id: string;
  triggerType: "VOICE" | "BUTTON";
  cloudinaryUrl: string;
  durationSeconds: number;
  latitude?: number;
  longitude?: number;
  googleMapsLink?: string;
  riskAnalysis?: RiskAnalysis;
  smsSent: boolean;
  emailSent: boolean;
  recordedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const formatElapsed = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
};

const riskColor = (level: string): string => {
  switch (level) {
    case "Critical":
      return "#7f1d1d";
    case "High":
      return "#dc2626";
    case "Medium":
      return "#d97706";
    case "Low":
    default:
      return "#16a34a";
  }
};

const riskBg = (level: string): string => {
  switch (level) {
    case "Critical":
      return "#fef2f2";
    case "High":
      return "#fff5f5";
    case "Medium":
      return "#fffbeb";
    case "Low":
    default:
      return "#f0fdf4";
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const RiskBadge = ({ level }: { level: string }) => (
  <View style={[styles.riskBadge, { backgroundColor: riskBg(level) }]}>
    <Text style={[styles.riskBadgeText, { color: riskColor(level) }]}>
      {level}
    </Text>
  </View>
);

const RiskScoreBar = ({ score }: { score: number }) => {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.75 ? "#dc2626" : score >= 0.5 ? "#d97706" : "#16a34a";
  return (
    <View style={styles.scoreBarWrapper}>
      <Text style={styles.scoreLabel}>Risk Score</Text>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${pct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.scorePct, { color }]}>{pct}%</Text>
    </View>
  );
};

const TranscriptSection = ({
  riskAnalysis,
}: {
  riskAnalysis: RiskAnalysis;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.transcriptContainer}>
      <TouchableOpacity
        style={styles.transcriptToggle}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.transcriptToggleText}>
          Transcript & Risk Analysis
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#6b7280"
        />
      </TouchableOpacity>

      {open && (
        <View
          style={[
            styles.transcriptBody,
            { borderLeftColor: riskColor(riskAnalysis.riskLevel) },
          ]}
        >
          <View style={styles.riskRow}>
            <RiskBadge level={riskAnalysis.riskLevel} />
          </View>
          <RiskScoreBar score={riskAnalysis.score} />

          <Text style={styles.transcriptMain}>
            {riskAnalysis.translatedText}
          </Text>
          {riskAnalysis.originalText ? (
            <Text style={styles.transcriptMuted}>
              Original: {riskAnalysis.originalText}
            </Text>
          ) : null}
          {riskAnalysis.romanizedText ? (
            <Text style={styles.transcriptMuted}>
              Romanized: {riskAnalysis.romanizedText}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

// ─── Recording Card ───────────────────────────────────────────────────────────

interface CardProps {
  item: AudioRecording;
  playingId: string | null;
  elapsedMs: number;
  onPlay: (item: AudioRecording) => void;
}

const RecordingCard = ({ item, playingId, elapsedMs, onPlay }: CardProps) => {
  const isPlaying = playingId === item._id;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.triggerBadge,
            item.triggerType === "VOICE"
              ? styles.triggerVoice
              : styles.triggerButton,
          ]}
        >
          <Ionicons
            name={item.triggerType === "VOICE" ? "mic" : "alert-circle"}
            size={11}
            color="#fff"
          />
          <Text style={styles.triggerBadgeText}>{item.triggerType}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.recordedAt)}</Text>
      </View>

      {/* Duration */}
      <Text style={styles.cardDuration}>
        <Ionicons name="time-outline" size={13} color="#6b7280" />{" "}
        {formatDuration(item.durationSeconds)}
      </Text>

      {/* Location */}
      {item.googleMapsLink ? (
        <TouchableOpacity
          style={styles.mapsRow}
          onPress={() => Linking.openURL(item.googleMapsLink!)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={14} color="#0ea5e9" />
          <Text style={styles.mapsText}>View on Maps</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.mapsRow}>
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text style={styles.mapsTextMuted}>Location unavailable</Text>
        </View>
      )}

      {/* Notification badges */}
      <View style={styles.notifRow}>
        <View
          style={[
            styles.notifBadge,
            item.smsSent ? styles.notifSent : styles.notifNotSent,
          ]}
        >
          <Ionicons
            name={
              item.smsSent
                ? "chatbubble-ellipses"
                : "chatbubble-ellipses-outline"
            }
            size={12}
            color={item.smsSent ? "#fff" : "#6b7280"}
          />
          <Text
            style={[
              styles.notifText,
              { color: item.smsSent ? "#fff" : "#6b7280" },
            ]}
          >
            SMS {item.smsSent ? "Sent" : "Not Sent"}
          </Text>
        </View>

        <View
          style={[
            styles.notifBadge,
            item.emailSent ? styles.notifSent : styles.notifNotSent,
          ]}
        >
          <Ionicons
            name={item.emailSent ? "mail" : "mail-outline"}
            size={12}
            color={item.emailSent ? "#fff" : "#6b7280"}
          />
          <Text
            style={[
              styles.notifText,
              { color: item.emailSent ? "#fff" : "#6b7280" },
            ]}
          >
            Email {item.emailSent ? "Sent" : "Not Sent"}
          </Text>
        </View>
      </View>

      {/* Playback controls */}
      <View style={styles.playRow}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => onPlay(item)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={36}
            color="#0ea5e9"
          />
        </TouchableOpacity>

        <View style={styles.elapsedWrapper}>
          {isPlaying ? (
            <Text style={styles.elapsedText}>{formatElapsed(elapsedMs)}</Text>
          ) : (
            <Text style={styles.elapsedTextMuted}>Tap to play</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => Linking.openURL(item.cloudinaryUrl)}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Transcript (collapsible) */}
      {item.riskAnalysis ? (
        <TranscriptSection riskAnalysis={item.riskAnalysis} />
      ) : null}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RecordingScreen() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackStartRef = useRef<number>(0);

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchRecordings = useCallback(async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch(`${API_URL}/audio/my-recordings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load recordings.");
      }

      setRecordings(json.data ?? []);
    } catch (e: any) {
      console.error("[RecordingScreen] Fetch error:", e);
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
    return () => {
      // Clean up sound on unmount
      stopSound();
    };
  }, [fetchRecordings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecordings();
  }, [fetchRecordings]);

  // ── Playback ────────────────────────────────────────────────────────────

  const stopSound = async () => {
    if (elapsedInterval.current) {
      clearInterval(elapsedInterval.current);
      elapsedInterval.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setPlayingId(null);
    setElapsedMs(0);
  };

  const handlePlay = async (item: AudioRecording) => {
    // Tapping the same card pauses/stops it
    if (playingId === item._id) {
      await stopSound();
      return;
    }

    // Stop any currently playing sound
    await stopSound();

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: item.cloudinaryUrl },
        { shouldPlay: true },
      );

      soundRef.current = sound;
      setPlayingId(item._id);
      playbackStartRef.current = Date.now();
      setElapsedMs(0);

      // Elapsed-time ticker
      elapsedInterval.current = setInterval(() => {
        setElapsedMs(Date.now() - playbackStartRef.current);
      }, 500);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          stopSound();
        }
      });
    } catch (e) {
      console.error("[RecordingScreen] Playback error:", e);
      await stopSound();
    }
  };

  // ── Render states ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading recordings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={56} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchRecordings();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header count={recordings.length} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          recordings.length === 0
            ? styles.scrollContentEmpty
            : styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0ea5e9"]}
            tintColor="#0ea5e9"
          />
        }
      >
        {recordings.length === 0 ? (
          <EmptyState />
        ) : (
          recordings.map((item) => (
            <RecordingCard
              key={item._id}
              item={item}
              playingId={playingId}
              elapsedMs={elapsedMs}
              onPlay={handlePlay}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small layout components ──────────────────────────────────────────────────

const Header = ({ count }: { count?: number }) => (
  <View style={styles.header}>
    <View style={styles.headerInner}>
      <Text style={styles.headerTitle}>SOS Recordings</Text>
      {count !== undefined && count > 0 ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{count}</Text>
        </View>
      ) : null}
    </View>
  </View>
);

const EmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="mic-off-outline" size={72} color="#bae6fd" />
    <Text style={styles.emptyTitle}>No recordings yet</Text>
    <Text style={styles.emptySubtitle}>
      Recordings will appear here after an SOS is triggered.
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ecfeff",
  },
  header: {
    backgroundColor: "#0ea5e9",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  triggerVoice: {
    backgroundColor: "#7c3aed",
  },
  triggerButton: {
    backgroundColor: "#dc2626",
  },
  triggerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  cardDuration: {
    fontSize: 13,
    color: "#6b7280",
  },

  // ── Location ─────────────────────────────────────────────────────────────
  mapsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapsText: {
    fontSize: 13,
    color: "#0ea5e9",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  mapsTextMuted: {
    fontSize: 13,
    color: "#9ca3af",
  },

  // ── Notification badges ───────────────────────────────────────────────────
  notifRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  notifBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  notifSent: {
    backgroundColor: "#16a34a",
  },
  notifNotSent: {
    backgroundColor: "#f3f4f6",
  },
  notifText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Playback ──────────────────────────────────────────────────────────────
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  playBtn: {
    // touchable target
  },
  elapsedWrapper: {
    flex: 1,
  },
  elapsedText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0ea5e9",
    fontVariant: ["tabular-nums"],
  },
  elapsedTextMuted: {
    fontSize: 13,
    color: "#9ca3af",
  },
  downloadBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Transcript ────────────────────────────────────────────────────────────
  transcriptContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
    marginTop: 2,
  },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transcriptToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  transcriptBody: {
    marginTop: 10,
    borderLeftWidth: 3,
    paddingLeft: 12,
    gap: 8,
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  riskBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scoreBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6b7280",
    width: 68,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  scorePct: {
    fontSize: 12,
    fontWeight: "700",
    width: 36,
    textAlign: "right",
  },
  transcriptMain: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  transcriptMuted: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 17,
  },
});
