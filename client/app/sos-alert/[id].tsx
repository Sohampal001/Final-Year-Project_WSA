// app/sos-alert/[id].tsx
// Recipient-facing detail screen for an incoming SOS broadcast.
// Opened from a push notification tap (see app/_layout.tsx routing) via
// router.push(`/sos-alert/<broadcastId>`).
import { getSosBroadcast, SosBroadcastDetail } from "@/api/sosApi";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#dc2626";

// ─── Distance helper (copied from places/[category].tsx) ─────────────────────
const toRad = (deg: number) => (deg * Math.PI) / 180;
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function timeSince(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function triggerLabel(triggerType?: string): string {
  switch ((triggerType || "").toUpperCase()) {
    case "VOICE":
      return "Voice trigger";
    case "BUTTON":
      return "Panic button";
    default:
      return triggerType || "Unknown";
  }
}

export default function SosAlertScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeLocation = useLocationStore((s) => s.location);

  const [broadcast, setBroadcast] = useState<SosBroadcastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    storeLocation?.lat && storeLocation?.lon
      ? { lat: storeLocation.lat, lon: storeLocation.lon }
      : null,
  );

  const fetchBroadcast = useCallback(async () => {
    if (!id) {
      setError("Missing alert id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getSosBroadcast(id);
      setBroadcast(result);
    } catch (e: any) {
      setError(e?.message || "Could not load this alert.");
      setBroadcast(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBroadcast();
  }, [fetchBroadcast]);

  // Resolve the recipient's location: prefer the shared store, else ask the OS.
  useEffect(() => {
    if (coords) return;
    if (storeLocation?.lat && storeLocation?.lon) {
      setCoords({ lat: storeLocation.lat, lon: storeLocation.lon });
      return;
    }
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        // distance simply won't render
      }
    })();
  }, [coords, storeLocation]);

  const distance = useMemo(() => {
    if (!broadcast || !coords) return null;
    return haversineMeters(
      coords.lat,
      coords.lon,
      broadcast.latitude,
      broadcast.longitude,
    );
  }, [broadcast, coords]);

  const call = useCallback((mobile?: string) => {
    if (!mobile) return;
    // Direct dialer open — canOpenURL("tel:") is unreliable on Android 11+.
    Linking.openURL(`tel:${mobile.replace(/\s+/g, "")}`).catch(() => {});
  }, []);

  const openDirections = useCallback(() => {
    if (!broadcast) return;
    const { latitude, longitude } = broadcast;
    const label = encodeURIComponent(broadcast.victimName || "SOS location");
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate&q=${label}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`);
    });
  }, [broadcast]);

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.mutedText}>Loading alert…</Text>
        </View>
      );
    }

    if (error || !broadcast) {
      return (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline" size={40} color="#cbd5e1" />
          <Text style={styles.errorText}>{error || "Alert not found."}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBroadcast}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const callable = !!broadcast.victimMobile;

    return (
      <View style={styles.body}>
        {/* Prominent emergency banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🚨</Text>
          <Text style={styles.bannerText}>Someone needs help</Text>
        </View>

        {/* Victim card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons
                name="account-alert"
                size={24}
                color={ACCENT}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.victimName} numberOfLines={1}>
                {broadcast.victimName || "Unknown"}
              </Text>
              <Text style={styles.cardSub}>{triggerLabel(broadcast.triggerType)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.distancePill}>
              <Ionicons name="navigate" size={12} color={ACCENT} />
              <Text style={styles.distanceText}>
                {distance != null ? formatDistance(distance) : "distance —"}
              </Text>
            </View>
            <View style={styles.timePill}>
              <Ionicons name="time-outline" size={12} color="#b91c1c" />
              <Text style={styles.timeText}>{timeSince(broadcast.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn, !callable && styles.actionDisabled]}
            disabled={!callable}
            onPress={() => call(broadcast.victimMobile)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.actionText}>
              {callable ? "Call" : "No number"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dirBtn]}
            onPress={openDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.actionText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="alert" size={20} color={ACCENT} />
            <Text style={styles.headerTitle}>SOS Alert</Text>
          </View>
          <Text style={styles.headerSub}>Emergency nearby</Text>
        </View>
      </View>

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, marginLeft: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  body: { padding: 16, gap: 16 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    paddingVertical: 18,
  },
  bannerEmoji: { fontSize: 24 },
  bannerText: { fontSize: 18, fontWeight: "800", color: ACCENT },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: { flex: 1 },
  victimName: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  cardSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  distanceText: { fontSize: 12, fontWeight: "700", color: ACCENT },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  actionText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  callBtn: { backgroundColor: "#22c55e" },
  dirBtn: { backgroundColor: "#0ea5e9" },
  actionDisabled: { backgroundColor: "#cbd5e1" },
  mutedText: { fontSize: 13, color: "#64748b", textAlign: "center" },
  errorText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    fontWeight: "600",
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  retryText: { color: "#ffffff", fontWeight: "700" },
});
