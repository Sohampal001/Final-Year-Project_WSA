// app/(tabs)/nearest_user.tsx
// @ts-nocheck
import { getNearbyUsers, NearbyUser } from "@/api/locationApi";
import { useLocationStore } from "@/store/useLocationStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function NearestUserScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(500); // Default 500m
  const location = useLocationStore((state) => state.location);

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
        (loc) => setUserLocation(loc.coords)
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Function to fetch nearby users
  const fetchNearbyUsers = useCallback(async () => {
    const lat = location?.latitude || userLocation?.latitude;
    const lng = location?.longitude || userLocation?.longitude;

    if (lat && lng) {
      console.log("📍 Fetching nearby users at:", lat, lng);
      setLoading(true);
      try {
        const users = await getNearbyUsers(lat, lng, searchRadius);
        console.log("✅ Got nearby users:", users.length);
        setNearbyUsers(users);
      } catch (error) {
        console.error("❌ Error fetching nearby users:", error);
        setNearbyUsers([]);
      } finally {
        setLoading(false);
      }
    } else {
      console.log("⚠️ No location available yet");
    }
  }, [
    location?.latitude,
    location?.longitude,
    userLocation?.latitude,
    userLocation?.longitude,
    searchRadius,
  ]);

  // Fetch when page comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 Page focused - fetching nearby users");
      fetchNearbyUsers();

      // Set up 30-second interval
      const interval = setInterval(() => {
        console.log("⏰ Auto-refresh triggered");
        fetchNearbyUsers();
      }, 30000);

      return () => {
        console.log("🛑 Clearing interval");
        clearInterval(interval);
      };
    }, [fetchNearbyUsers])
  );

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    await fetchNearbyUsers();
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Default to a safe location if no location is available yet
  const currentLat = location?.latitude || userLocation?.latitude || 28.6139; // Default to Delhi
  const currentLng = location?.longitude || userLocation?.longitude || 77.209;

  // Calculate appropriate delta based on nearby users to show all markers
  const calculateMapRegion = () => {
    // Ensure we have valid coordinates
    const validLat = currentLat || 28.6139;
    const validLng = currentLng || 77.209;

    if (nearbyUsers.length === 0) {
      return {
        latitude: validLat,
        longitude: validLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }

    // Find min/max coordinates to fit all markers
    let minLat = validLat;
    let maxLat = validLat;
    let minLng = validLng;
    let maxLng = validLng;

    nearbyUsers.forEach((user) => {
      if (
        user.latitude &&
        user.longitude &&
        !isNaN(user.latitude) &&
        !isNaN(user.longitude)
      ) {
        minLat = Math.min(minLat, user.latitude);
        maxLat = Math.max(maxLat, user.latitude);
        minLng = Math.min(minLng, user.longitude);
        maxLng = Math.max(maxLng, user.longitude);
      }
    });

    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.02),
      longitudeDelta: Math.max(lngDelta, 0.02),
    };
  };

  const region = calculateMapRegion();

  // Don't render map if we don't have a valid location
  const hasValidLocation =
    (location?.latitude && location?.longitude) ||
    (userLocation?.latitude && userLocation?.longitude);

  // Ensure coordinates are valid numbers
  const safeCurrentLat =
    !isNaN(currentLat) && currentLat ? currentLat : 28.6139;
  const safeCurrentLng = !isNaN(currentLng) && currentLng ? currentLng : 77.209;

  return (
    <SafeAreaView style={styles.nearSafe}>
      <View style={styles.nearHeader}>
        <View style={styles.nearHeaderInner}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.nearTitle}>Nearest Users</Text>
              <Text style={styles.nearSubtitle}>
                {nearbyUsers.length} users nearby • Real-time tracking
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
              disabled={loading}
            >
              <Ionicons name="refresh" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {!hasValidLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : loading && nearbyUsers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Finding nearby users...</Text>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {nearbyUsers.map((user, idx) => (
                <View key={user.userId || idx} style={styles.nearChip}>
                  <View style={styles.nearChipDot} />
                  <Text style={styles.nearChipName}>
                    {user.name} – {formatDistance(user.distance)}
                  </Text>
                </View>
              ))}
              {nearbyUsers.length === 0 && (
                <View style={styles.nearChip}>
                  <Text style={styles.nearChipName}>No users nearby</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.mapCard}>
              <MapView
                style={styles.mapView}
                initialRegion={region}
                key={`${region.latitude}-${region.longitude}`}
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                {/* Only show current user marker if we have a valid location */}
                {hasValidLocation && (
                  <Marker
                    coordinate={{
                      latitude: safeCurrentLat,
                      longitude: safeCurrentLng,
                    }}
                    anchor={{ x: 0.5, y: 1 }}
                    centerOffset={{ x: 0, y: -20 }}
                  >
                    <View style={styles.mapMarkerUserOuter}>
                      <View style={styles.mapMarkerUserInner}>
                        <Ionicons name="location" size={24} color="#ffffff" />
                      </View>
                      <View style={styles.mapMarkerLabel}>
                        <Text style={styles.mapMarkerLabelText}>You</Text>
                      </View>
                    </View>
                  </Marker>
                )}

                {/* Only show markers for users with valid coordinates */}
                {nearbyUsers.map((user, idx) => {
                  // Validate coordinates are numbers and not null/undefined
                  if (
                    !user.latitude ||
                    !user.longitude ||
                    isNaN(user.latitude) ||
                    isNaN(user.longitude)
                  ) {
                    return null;
                  }
                  return (
                    <Marker
                      key={`${user.userId || idx}-${user.latitude}-${
                        user.longitude
                      }`}
                      coordinate={{
                        latitude: Number(user.latitude),
                        longitude: Number(user.longitude),
                      }}
                      anchor={{ x: 0.5, y: 1 }}
                      centerOffset={{ x: 0, y: -20 }}
                    >
                      <View style={styles.mapMarkerOtherOuter}>
                        <View style={styles.mapMarkerOtherInner}>
                          <Ionicons name="person" size={20} color="#ffffff" />
                        </View>
                        <View style={styles.mapMarkerLabel}>
                          <Text style={styles.mapMarkerLabelText}>
                            {user.name}
                          </Text>
                          <Text style={styles.mapMarkerDistanceText}>
                            {formatDistance(user.distance)}
                          </Text>
                        </View>
                      </View>
                    </Marker>
                  );
                })}
              </MapView>

              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn}>
                  <Text style={styles.mapControlText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlBtn}>
                  <Text style={styles.mapControlText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlBtn}>
                  <Ionicons name="locate-outline" size={18} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* User Details List */}
            {nearbyUsers.length > 0 && (
              <View style={styles.userListCard}>
                <Text style={styles.userListTitle}>Nearby Users Details</Text>
                {nearbyUsers.map((user, idx) => (
                  <View key={user.userId || idx} style={styles.userCard}>
                    <View style={styles.userIconBox}>
                      <Ionicons name="person" size={24} color="#06b6d4" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userDistance}>
                        {formatDistance(user.distance)} away
                      </Text>
                      {user.mobile && (
                        <Text style={styles.userContact}>{user.mobile}</Text>
                      )}
                    </View>
                    <View style={styles.userLocationIcon}>
                      <Ionicons name="location" size={20} color="#6b7280" />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  nearSafe: {
    flex: 1,
    backgroundColor: "#e0f2fe",
  },
  nearHeader: {
    backgroundColor: "#06b6d4",
    elevation: 4,
  },
  nearHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nearTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  nearSubtitle: {
    fontSize: 12,
    color: "#cffafe",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  nearChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  nearChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#bbf7d0",
    marginRight: 6,
  },
  nearChipName: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  mapCard: {
    height: 400,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    borderWidth: 3,
    borderColor: "#cbd5f5",
    marginBottom: 16,
  },
  mapView: {
    flex: 1,
  },
  mapMarkerUserOuter: {
    alignItems: "center",
    width: 80,
    minHeight: 80,
    paddingBottom: 10,
  },
  mapMarkerUserInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22c55e", // Green color for current user
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  mapMarkerOtherOuter: {
    alignItems: "center",
    width: 100,
    minHeight: 90,
    paddingBottom: 10,
  },
  mapMarkerOtherInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef4444", // Red color for nearby users
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  mapMarkerLabel: {
    marginTop: 6,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
    minWidth: 70,
    maxWidth: 95,
    alignItems: "center",
  },
  mapMarkerLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  mapMarkerDistanceText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#ef4444",
    marginTop: 1,
  },
  mapControls: {
    position: "absolute",
    right: 10,
    bottom: 10,
    alignItems: "center",
  },
  mapControlBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    elevation: 2,
  },
  mapControlText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  userListCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    elevation: 3,
  },
  userListTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  userDistance: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  userContact: {
    fontSize: 12,
    color: "#9ca3af",
  },
  userLocationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
});
