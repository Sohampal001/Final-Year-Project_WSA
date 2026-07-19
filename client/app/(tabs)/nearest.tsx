// app/(tabs)/nearest.tsx
// @ts-nocheck
import { getNearbyUsers, NearbyUser } from "@/api/locationApi";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_DELHI_LAT = 28.6139;
const DEFAULT_DELHI_LNG = 77.209;

export default function NearestUserScreen() {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<any>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchRadius] = useState(500);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const location = useLocationStore((state) => state.location);
  const mapRef = useRef<any>(null);
  const mapZoomRef = useRef(15.5);
  const cameraCenterRef = useRef({
    latitude: DEFAULT_DELHI_LAT,
    longitude: DEFAULT_DELHI_LNG,
  });
  const didInitialRecenterRef = useRef(false);
  const isMapReadyRef = useRef(false);
  const cameraInFlightRef = useRef(false);
  const pendingCameraConfigRef = useRef<any | null>(null);

  useEffect(() => {
    let subscription: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setUserLocation(current.coords);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
        },
        (loc) => setUserLocation(loc.coords),
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const safeCurrentLat =
    location?.latitude || userLocation?.latitude || DEFAULT_DELHI_LAT;
  const safeCurrentLng =
    location?.longitude || userLocation?.longitude || DEFAULT_DELHI_LNG;

  const hasValidLocation =
    Number.isFinite(location?.latitude) ||
    Number.isFinite(userLocation?.latitude);

  const formatDistance = (meters: number): string => {
    if (!Number.isFinite(meters)) return "N/A";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const userLocationLabel = `${safeCurrentLat.toFixed(5)}, ${safeCurrentLng.toFixed(5)}`;

  const validNearbyUsers = useMemo(
    () =>
      nearbyUsers.filter(
        (user) =>
          Number.isFinite(user.latitude) && Number.isFinite(user.longitude),
      ),
    [nearbyUsers],
  );

  const applyCameraUpdate = useCallback(async (cameraConfig: any) => {
    if (!mapRef.current || !isMapReadyRef.current) {
      pendingCameraConfigRef.current = cameraConfig;
      return;
    }

    if (cameraInFlightRef.current) {
      pendingCameraConfigRef.current = cameraConfig;
      return;
    }

    cameraInFlightRef.current = true;

    try {
      await mapRef.current.setCameraPosition(cameraConfig);
    } catch (error: any) {
      const message = String(error?.message || "");
      if (
        !message.includes("CancellationException") &&
        !message.includes("Animation cancelled")
      ) {
        console.error("Camera update failed", error);
      }
    } finally {
      cameraInFlightRef.current = false;

      const pendingCameraConfig = pendingCameraConfigRef.current;
      pendingCameraConfigRef.current = null;

      if (pendingCameraConfig) {
        applyCameraUpdate(pendingCameraConfig);
      }
    }
  }, []);

  const focusOnCoordinates = useCallback(
    async (
      latitude: number,
      longitude: number,
      zoom: number = mapZoomRef.current,
    ) => {
      const cameraConfig: any = {
        coordinates: { latitude, longitude },
        zoom,
      };

      await applyCameraUpdate(cameraConfig);

      mapZoomRef.current = zoom;
      cameraCenterRef.current = { latitude, longitude };
    },
    [applyCameraUpdate],
  );

  const focusOnUser = useCallback(
    (user: NearbyUser) => {
      setSelectedUserId(user.userId);
      focusOnCoordinates(
        Number(user.latitude),
        Number(user.longitude),
        Math.max(mapZoomRef.current, 16),
      );
    },
    [focusOnCoordinates],
  );

  const recenterToCurrentLocation = useCallback(() => {
    focusOnCoordinates(Number(safeCurrentLat), Number(safeCurrentLng), 15.5);
  }, [focusOnCoordinates, safeCurrentLat, safeCurrentLng]);

  const fetchNearbyUsers = useCallback(
    async (isInitial = false) => {
      const lat = location?.latitude || userLocation?.latitude;
      const lng = location?.longitude || userLocation?.longitude;

      if (!lat || !lng) return;

      if (isInitial) setInitialLoading(true);
      else setLoading(true);

      try {
        const users = await getNearbyUsers(lat, lng, searchRadius);
        setNearbyUsers(users);
      } catch (error) {
        console.error("Error fetching nearby users", error);
        setNearbyUsers([]);
      } finally {
        if (isInitial) setInitialLoading(false);
        else setLoading(false);
      }
    },
    [
      location?.latitude,
      location?.longitude,
      userLocation?.latitude,
      userLocation?.longitude,
      searchRadius,
    ],
  );
  useFocusEffect(
    useCallback(() => {
      fetchNearbyUsers(true);

      const interval = setInterval(() => {
        fetchNearbyUsers(false);
      }, 30000);

      return () => clearInterval(interval);
    }, [fetchNearbyUsers]),
  );
  useEffect(() => {
    if (
      !didInitialRecenterRef.current &&
      hasValidLocation &&
      isMapReadyRef.current
    ) {
      didInitialRecenterRef.current = true;
      recenterToCurrentLocation();
    }
  }, [hasValidLocation, recenterToCurrentLocation]);

  const mapMarkers = useMemo(() => {
    const currentUserMarker = {
      id: "you",
      coordinates: {
        latitude: Number(safeCurrentLat),
        longitude: Number(safeCurrentLng),
      },
      title: "You",
      showCallout: true,
      zIndex: 999,
    };

    const userMarkers = validNearbyUsers.map((user, index) => {
      const markerId = user.userId || `user-${index}`;
      const firstName = user.name?.trim()?.split(" ")[0] || "User";

      return {
        id: markerId,
        coordinates: {
          latitude: Number(user.latitude),
          longitude: Number(user.longitude),
        },
        title: `${firstName} • ${formatDistance(user.distance)}`,
        showCallout: true,
        zIndex: selectedUserId === markerId ? 998 : 500,
      };
    });

    return [currentUserMarker, ...userMarkers];
  }, [safeCurrentLat, safeCurrentLng, validNearbyUsers, selectedUserId]);

  const onMarkerPress = useCallback(
    (marker: any) => {
      if (!marker?.id || marker.id === "you") return;

      const selectedUser = validNearbyUsers.find((user, index) => {
        const markerId = user.userId || `user-${index}`;
        return markerId === marker.id;
      });

      if (selectedUser) {
        focusOnUser(selectedUser);
        setSheetOpen(true);
      }
    },
    [focusOnUser, validNearbyUsers],
  );

  const zoomIn = () => {
    const nextZoom = Math.min(mapZoomRef.current + 1, 20);
    focusOnCoordinates(
      Number(cameraCenterRef.current.latitude),
      Number(cameraCenterRef.current.longitude),
      nextZoom,
    );
  };

  const zoomOut = () => {
    const nextZoom = Math.max(mapZoomRef.current - 1, 5);
    focusOnCoordinates(
      Number(cameraCenterRef.current.latitude),
      Number(cameraCenterRef.current.longitude),
      nextZoom,
    );
  };

  const callUser = (mobile?: string) => {
    if (!mobile) return;
    // Open the dialer directly — canOpenURL("tel:") returns false on Android
    // 11+ unless the scheme is in the manifest <queries>, silently blocking it.
    Linking.openURL(`tel:${String(mobile).replace(/\s+/g, "")}`).catch(() => {});
  };

  const renderUserCard = ({ item, index }) => {
    const markerId = item.userId || `user-${index}`;
    const selected = markerId === selectedUserId;

    return (
      <TouchableOpacity
        style={[styles.userCard, selected && styles.userCardSelected]}
        activeOpacity={0.85}
        onPress={() => focusOnUser(item)}
      >
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || "Unknown"}</Text>

          <Text style={styles.userSub}>
            {formatDistance(item.distance)} away
          </Text>

          {item.mobile && <Text style={styles.userPhone}>{item.mobile}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.callButton, !item.mobile && styles.callDisabled]}
          disabled={!item.mobile}
          onPress={() => callUser(item.mobile)}
        >
          <Ionicons name="call" size={16} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const MapComponent = Platform.OS === "ios" ? AppleMaps.View : GoogleMaps.View;

  return (
    <SafeAreaView style={styles.screen}>
      <MapComponent
        ref={mapRef}
        style={styles.map}
        markers={mapMarkers}
        uiSettings={{
          zoomControlsEnabled: false,
          mapToolbarEnabled: false,
          myLocationButtonEnabled: false,
          compassEnabled: false,
        }}
        onMarkerClick={onMarkerPress}
        onMapLoaded={() => {
          isMapReadyRef.current = true;
          if (hasValidLocation && !didInitialRecenterRef.current) {
            didInitialRecenterRef.current = true;
            recenterToCurrentLocation();
          }
        }}
        onCameraMove={(event: any) => {
          if (event?.coordinates?.latitude && event?.coordinates?.longitude) {
            cameraCenterRef.current = {
              latitude: Number(event.coordinates.latitude),
              longitude: Number(event.coordinates.longitude),
            };
          }
          if (Number.isFinite(event?.zoom)) {
            mapZoomRef.current = Number(event.zoom);
          }
        }}
      />

      {initialLoading ? (
        <View style={styles.initialLoaderOverlay}>
          <View style={styles.initialLoaderCard}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.initialLoaderTitle}>
              Loading Nearby Users...
            </Text>
            <Text style={styles.initialLoaderText}>
              Fetching map and nearby user details
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.topOverlay, { top: insets.top + 8 }]}>
        <View style={styles.topCard}>
          <View>
            <Text style={styles.title}>Nearby Users</Text>
            <Text style={styles.subtitle}>
              {validNearbyUsers.length} users around you
            </Text>
            <Text style={styles.locationText}>You: {userLocationLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchNearbyUsers(false)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="refresh" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!hasValidLocation && (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.centerLoaderText}>Fetching your location...</Text>
        </View>
      )}

      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
          <Text style={styles.controlText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
          <Text style={styles.controlText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={recenterToCurrentLocation}
        >
          <Ionicons name="locate" size={18} color="#0b253a" />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.bottomSheet, !sheetOpen && styles.bottomSheetCollapsed]}
      >
        <TouchableOpacity
          style={styles.sheetHeader}
          onPress={() => setSheetOpen((prev) => !prev)}
        >
          <Text style={styles.sheetTitle}>
            Nearby User Details ({validNearbyUsers.length})
          </Text>
          <Ionicons
            name={sheetOpen ? "chevron-down" : "chevron-up"}
            size={18}
            color="#123"
          />
        </TouchableOpacity>

        {sheetOpen && (
          <FlatList
            data={validNearbyUsers}
            keyExtractor={(item, index) => item.userId || `row-${index}`}
            renderItem={renderUserCard}
            contentContainerStyle={styles.sheetListContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No nearby users found right now.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
  },
  topCard: {
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 18,
  },
  subtitle: {
    color: "#0f766e",
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  locationText: {
    marginTop: 4,
    color: "#475569",
    fontSize: 12,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLoader: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    alignItems: "center",
  },

  centerLoaderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  mapControls: {
    position: "absolute",
    right: 14,
    top: 150,
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0b253a",
  },
  bottomSheet: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    maxHeight: "42%",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  bottomSheetCollapsed: {
    maxHeight: 56,
  },

  sheetHeader: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    position: "absolute",
    alignSelf: "center",
    top: 4,
  },

  sheetTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#0f172a",
  },
  sheetListContent: {
    padding: 10,
    paddingBottom: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },

  userCardSelected: {
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },

  userSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },

  userPhone: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },

  callButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },

  callDisabled: {
    backgroundColor: "#cbd5f5",
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#64748b",
    fontWeight: "600",
  },
  initialLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  initialLoaderCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  initialLoaderTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  initialLoaderText: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
});
