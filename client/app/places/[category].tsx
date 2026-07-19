// app/places/[category].tsx
// Dedicated per-category nearby-places list (police / hospital / pharmacy / bus stop).
// Opened from the Home category buttons via router.push(`/places/<categoryKey>`).
import {
  getNearbyPlaces,
  formatDistance,
  NearbyPlace,
} from "@/api/nearbyPlacesApi";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Category config (mirrors Home's CATEGORY_META) ──────────────────────────
type CategoryKey = "policeStations" | "hospitals" | "pharmacies" | "busStops";
type ApiType = "police" | "hospital" | "pharmacy" | "bus_station";
type SortMode = "nearest" | "open" | "contact";

const CATEGORY_CONFIG: Record<
  CategoryKey,
  {
    title: string;
    apiType: ApiType;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
  }
> = {
  policeStations: {
    title: "Police Stations",
    apiType: "police",
    icon: "shield-home",
    color: "#2563eb",
  },
  hospitals: {
    title: "Hospitals",
    apiType: "hospital",
    icon: "hospital-building",
    color: "#dc2626",
  },
  pharmacies: {
    title: "Pharmacies",
    apiType: "pharmacy",
    icon: "medical-bag",
    color: "#16a34a",
  },
  busStops: {
    title: "Bus Stops",
    apiType: "bus_station",
    icon: "bus-stop",
    color: "#ea580c",
  },
};

const SORTS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "nearest", label: "Nearest", icon: "navigate" },
  { key: "open", label: "Open now", icon: "time" },
  { key: "contact", label: "Has phone", icon: "call" },
];

// ─── Distance fallback (server usually provides place.distance) ───────────────
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

const hasPhone = (p: NearbyPlace) => !!p.contactNumber && p.contactNumber.trim().length > 0;

export default function PlacesByCategoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const storeLocation = useLocationStore((s) => s.location);

  const config = CATEGORY_CONFIG[category as CategoryKey];

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    storeLocation?.lat && storeLocation?.lon
      ? { lat: storeLocation.lat, lon: storeLocation.lon }
      : null,
  );
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("nearest");

  // Resolve current location: prefer the shared store, else ask the OS.
  useEffect(() => {
    if (coords) return;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        // handled by fetch guard / error state
      }
    })();
  }, [coords]);

  // Keep coords in sync if the store location arrives later.
  useEffect(() => {
    if (!coords && storeLocation?.lat && storeLocation?.lon) {
      setCoords({ lat: storeLocation.lat, lon: storeLocation.lon });
    }
  }, [storeLocation, coords]);

  const fetchPlaces = useCallback(
    async (isRefresh = false) => {
      if (!config || !coords) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await getNearbyPlaces(
          coords.lat,
          coords.lon,
          config.apiType,
          5000,
          25,
        );
        // Ensure every item has a usable distance for sorting/display.
        const withDistance = (result || []).map((p) => ({
          ...p,
          distance:
            typeof p.distance === "number"
              ? p.distance
              : p.location
                ? haversineMeters(
                    coords.lat,
                    coords.lon,
                    p.location.lat,
                    p.location.lng,
                  )
                : Number.POSITIVE_INFINITY,
        }));
        setPlaces(withDistance);
      } catch (e: any) {
        setError(e?.message || "Could not load nearby places.");
        setPlaces([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config, coords],
  );

  useEffect(() => {
    fetchPlaces(false);
  }, [fetchPlaces]);

  const sortedPlaces = useMemo(() => {
    const byDistance = (a: NearbyPlace, b: NearbyPlace) =>
      (a.distance ?? Infinity) - (b.distance ?? Infinity);

    const list = [...places];
    switch (sortMode) {
      case "open":
        // Open first, then nearest.
        list.sort((a, b) => {
          const ao = a.isOpen ? 0 : 1;
          const bo = b.isOpen ? 0 : 1;
          return ao !== bo ? ao - bo : byDistance(a, b);
        });
        break;
      case "contact":
        // Callable first, then nearest.
        list.sort((a, b) => {
          const ac = hasPhone(a) ? 0 : 1;
          const bc = hasPhone(b) ? 0 : 1;
          return ac !== bc ? ac - bc : byDistance(a, b);
        });
        break;
      case "nearest":
      default:
        // Nearest, tie-broken toward places you can call.
        list.sort((a, b) => {
          const d = byDistance(a, b);
          if (d !== 0) return d;
          return (hasPhone(a) ? 0 : 1) - (hasPhone(b) ? 0 : 1);
        });
        break;
    }
    return list;
  }, [places, sortMode]);

  const call = useCallback((mobile?: string) => {
    if (!mobile) return;
    // Open the dialer directly — canOpenURL("tel:") returns false on Android
    // 11+ unless the scheme is in the manifest <queries>, silently blocking it.
    Linking.openURL(`tel:${mobile.replace(/\s+/g, "")}`).catch(() => {});
  }, []);

  const openDirections = useCallback((place: NearbyPlace) => {
    if (!place.location) return;
    const { lat, lng } = place.location;
    const label = encodeURIComponent(place.name || "Destination");
    // Universal Google Maps directions URL — opens the app if installed, else browser.
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.place_id}&travelmode=driving&dir_action=navigate&q=${label}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
    });
  }, []);

  // ─── Invalid category guard ────────────────────────────────────────────────
  if (!config) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>Unknown category.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderCard = ({ item }: { item: NearbyPlace }) => {
    const callable = hasPhone(item);
    return (
      <View style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: `${config.color}1A` }]}>
          <MaterialCommunityIcons
            name={config.icon}
            size={22}
            color={config.color}
          />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name || "Unknown"}
          </Text>
          {!!item.address && (
            <Text style={styles.cardAddress} numberOfLines={2}>
              {item.address}
            </Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.distancePill}>
              <Ionicons name="navigate" size={11} color="#0f766e" />
              <Text style={styles.distanceText}>
                {formatDistance(item.distance ?? 0)}
              </Text>
            </View>
            {typeof item.isOpen === "boolean" && (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: item.isOpen ? "#dcfce7" : "#fee2e2" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.isOpen ? "#15803d" : "#b91c1c" },
                  ]}
                >
                  {item.isOpen ? "Open" : "Closed"}
                </Text>
              </View>
            )}
            {typeof item.rating === "number" && item.rating > 0 && (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={11} color="#f59e0b" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn, !callable && styles.actionDisabled]}
            disabled={!callable}
            onPress={() => call(item.contactNumber)}
            accessibilityLabel="Call"
          >
            <Ionicons name="call" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dirBtn]}
            onPress={() => openDirections(item)}
            accessibilityLabel="Directions"
          >
            <Ionicons name="navigate" size={18} color="#fff" />
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
            <MaterialCommunityIcons
              name={config.icon}
              size={20}
              color={config.color}
            />
            <Text style={styles.headerTitle}>{config.title}</Text>
          </View>
          <Text style={styles.headerSub}>
            {loading ? "Finding places…" : `${sortedPlaces.length} nearby`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchPlaces(true)}
          disabled={loading || refreshing || !coords}
          hitSlop={8}
        >
          <Ionicons name="refresh" size={20} color="#0f766e" />
        </TouchableOpacity>
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {SORTS.map((s) => {
          const active = sortMode === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortMode(s.key)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={s.icon}
                size={13}
                color={active ? "#ffffff" : "#475569"}
              />
              <Text style={[styles.sortText, active && styles.sortTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.mutedText}>Loading {config.title.toLowerCase()}…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline" size={40} color="#cbd5e1" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPlaces(false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedPlaces}
          keyExtractor={(item, i) => item.place_id || `place-${i}`}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => fetchPlaces(true)}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name={config.icon}
                size={44}
                color="#cbd5e1"
              />
              <Text style={styles.mutedText}>
                No {config.title.toLowerCase()} found within 5 km.
              </Text>
            </View>
          }
        />
      )}
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
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortChipActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  sortText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  sortTextActive: { color: "#ffffff" },
  listContent: { padding: 12, paddingBottom: 28, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  cardAddress: { fontSize: 12, color: "#64748b", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  distanceText: { fontSize: 11, fontWeight: "700", color: "#0f766e" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#b45309" },
  actions: { gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: { backgroundColor: "#22c55e" },
  dirBtn: { backgroundColor: "#0ea5e9" },
  actionDisabled: { backgroundColor: "#cbd5e1" },
  mutedText: { fontSize: 13, color: "#64748b", textAlign: "center" },
  errorText: { fontSize: 14, color: "#475569", textAlign: "center", fontWeight: "600" },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  retryText: { color: "#ffffff", fontWeight: "700" },
  backLink: { marginTop: 12 },
  backLinkText: { color: "#0f766e", fontWeight: "700" },
});
