// app/(tabs)/home.tsx
// @ts-nocheck
import { useLocationStore } from "@/store/useLocationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useSafetyStore } from "../../store/useSafetyStore";
import { useHomeBootstrapStore } from "../../store/useHomeBootstrapStore";
import { triggerGlobalSos } from "../../services/sosOrchestrator";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useFocusEffect } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
  ScrollView,
  RefreshControl,
} from "react-native";

const CATEGORY_META = {
  policeStations: {
    title: "Police Station",
    icon: "shield-home",
    color: "#2563eb",
    markerImage: require("../../assets/images/markers/police-marker.png"),
  },
  hospitals: {
    title: "Hospital",
    icon: "hospital-building",
    color: "#dc2626",
    markerImage: require("../../assets/images/markers/hospital-marker.png"),
  },
  pharmacies: {
    title: "Pharmacy",
    icon: "medical-bag",
    color: "#16a34a",
    markerImage: require("../../assets/images/markers/pharmacy-marker.png"),
  },
  busStops: {
    title: "Bus Stop",
    icon: "bus-stop",
    color: "#ea580c",
    markerImage: require("../../assets/images/markers/bus-marker.png"),
  },
} as const;

const DEFAULT_DELHI_LAT = 28.6139;
const DEFAULT_DELHI_LNG = 77.209;

type CategoryKey = keyof typeof CATEGORY_META;
type FilterKey = "all" | CategoryKey;

function getShortLocationLabel(user: any): string {
  const sourceAddress = user?.homeAddress || user?.workAddress || "";
  if (!sourceAddress) return "Location unavailable";

  const parts = sourceAddress.split(",").map((part: string) => part.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return parts[0] || "Location unavailable";
}

export default function HomeScreen() {
  const isBackgroundListening = useSafetyStore(
    (state) => state.isBackgroundListening,
  );
  const toggleBackgroundListening = useSafetyStore(
    (state) => state.toggleBackgroundListening,
  );

  const [sosLoading, setSosLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const location = useLocationStore((state) => state.location);
  const { user, trustedContacts } = useAuthStore();
  const nearbyUsers = useHomeBootstrapStore((state) => state.nearbyUsers);
  const nearbyLocations = useHomeBootstrapStore((state) => state.nearbyLocations);
  const bootstrapHomeData = useHomeBootstrapStore((state) => state.bootstrapHomeData);
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const hasTrustedContacts = trustedContacts && trustedContacts.length > 0;

  const safeCurrentLat = location?.lat || DEFAULT_DELHI_LAT;
  const safeCurrentLng = location?.lon || DEFAULT_DELHI_LNG;

  const handlePress = async () => {
    try {
      if (!location?.lat || !location?.lon) {
        Alert.alert(
          "Location Required",
          "Please enable location services to send emergency alerts.",
        );
        return;
      }

      if (!hasTrustedContacts) {
        Alert.alert(
          "No Trusted Contacts",
          "Please add at least one trusted contact before sending emergency alerts.",
          [
            {
              text: "Add Contacts",
              onPress: () => router.push("/(tabs)/contact"),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Emergency Alert",
        "This will send SMS alerts to all trusted contacts with your location.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Send Alert",
            style: "destructive",
            onPress: async () => {
              setSosLoading(true);
              try {
                await triggerGlobalSos();
                Alert.alert(
                  "Alert Sent",
                  "Emergency alerts delivered or queued successfully.",
                );
              } catch (error: any) {
                console.error("SOS Error:", error);
                Alert.alert(
                  "Error",
                  error.message || "Failed to send emergency alerts.",
                );
              } finally {
                setSosLoading(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error in handlePress:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
      return;
    }
    Alert.alert("Error", "Phone number not available");
  };

  const locationLabel = getShortLocationLabel(user);
  const nearbyUserCount = nearbyUsers?.length || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await bootstrapHomeData({
        latitude: location?.lat,
        longitude: location?.lon,
        force: true,
      });
    } catch (error) {
      console.error("Home refresh failed", error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      bootstrapHomeData({
        latitude: location?.lat,
        longitude: location?.lon,
      });
    }, [bootstrapHomeData, location?.lat, location?.lon]),
  );

  const filteredLocationGroups = useMemo(() => {
    if (selectedFilter === "all") {
      return nearbyLocations;
    }

    return {
      policeStations:
        selectedFilter === "policeStations" ? nearbyLocations.policeStations : [],
      hospitals: selectedFilter === "hospitals" ? nearbyLocations.hospitals : [],
      pharmacies: selectedFilter === "pharmacies" ? nearbyLocations.pharmacies : [],
      busStops: selectedFilter === "busStops" ? nearbyLocations.busStops : [],
    };
  }, [selectedFilter, nearbyLocations]);

  const mapMarkers = useMemo(() => {
    const markers: any[] = [
      {
        id: "current-user",
        coordinates: {
          latitude: Number(safeCurrentLat),
          longitude: Number(safeCurrentLng),
        },
        title: "You",
        snippet: "Current location",
        showCallout: true,
        tintColor: "#0ea5e9",
        zIndex: 999,
      },
    ];

    (nearbyUsers || []).forEach((person, index) => {
      if (!Number.isFinite(person.latitude) || !Number.isFinite(person.longitude)) {
        return;
      }

      markers.push({
        id: `nearby-user-${person.userId || index}`,
        coordinates: {
          latitude: Number(person.latitude),
          longitude: Number(person.longitude),
        },
        title: `User: ${person.name || "Unknown"}`,
        snippet: person.mobile || "Nearby user",
        showCallout: true,
        tintColor: "#7c3aed",
        zIndex: 700,
      });
    });

    const placeGroups: { key: CategoryKey; list: any[] }[] = [
      { key: "policeStations", list: filteredLocationGroups.policeStations || [] },
      { key: "hospitals", list: filteredLocationGroups.hospitals || [] },
      { key: "pharmacies", list: filteredLocationGroups.pharmacies || [] },
      { key: "busStops", list: filteredLocationGroups.busStops || [] },
    ];

    placeGroups.forEach(({ key, list }) => {
      list.forEach((place: any, index: number) => {
        const lat = place?.location?.lat;
        const lng = place?.location?.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }

        markers.push({
          id: `${key}-${place.place_id || index}`,
          coordinates: {
            latitude: Number(lat),
            longitude: Number(lng),
          },
          title: `${CATEGORY_META[key].title}: ${place.name || "Unknown"}`,
          snippet: place.address || "Nearby location",
          icon: CATEGORY_META[key].markerImage,
          tintColor: CATEGORY_META[key].color,
          showCallout: true,
          zIndex: 500,
        });
      });
    });

    return markers;
  }, [safeCurrentLat, safeCurrentLng, nearbyUsers, filteredLocationGroups]);

  const MapComponent = Platform.OS === "ios" ? AppleMaps.View : GoogleMaps.View;

  return (
    <SafeAreaView style={styles.homeSafe}>
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderInner}>
          <View style={styles.rowCenter}>
            <View style={styles.homeLogoBox}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.homeLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.homeTitle}>Aegis – The Safety App</Text>
              <Text style={styles.homeSubtitle}>Stay Safe, Stay Connected</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.homeBellBox}>
            <Ionicons name="notifications-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {(!user?.setTrustedContacts ||
        !trustedContacts ||
        trustedContacts.length === 0) && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push("/(tabs)/contact")}
          activeOpacity={0.85}
        >
          <View style={styles.warningIconBox}>
            <Ionicons name="warning" size={18} color="#dc2626" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>No Trusted Contacts Set</Text>
            <Text style={styles.warningMessage}>Add at least one trusted contact</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#dc2626" />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.infoRow}>
          <View style={styles.infoCardLeft}>
            <Text style={styles.infoLabel}>Your location</Text>
            <Text numberOfLines={1} style={styles.infoValue}>
              {locationLabel}
            </Text>
          </View>
          <View style={styles.infoCardRight}>
            <Text style={styles.infoLabel}>Nearby users</Text>
            <Text style={styles.infoValue}>{nearbyUserCount}</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
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
            onMapLoaded={async () => {
              try {
                await mapRef.current?.setCameraPosition({
                  coordinates: {
                    latitude: Number(safeCurrentLat),
                    longitude: Number(safeCurrentLng),
                  },
                  zoom: 14.5,
                });
              } catch (error) {
                console.error("Map camera setup failed", error);
              }
            }}
          />
        </View>

        <View style={styles.categoryRow}>
          {(
            Object.keys(CATEGORY_META) as CategoryKey[]
          ).map((key: CategoryKey) => {
            const item = CATEGORY_META[key];
            const isSelected = selectedFilter === key;
            const count =
              key === "policeStations"
                ? nearbyLocations.policeStations.length
                : key === "hospitals"
                  ? nearbyLocations.hospitals.length
                  : key === "pharmacies"
                    ? nearbyLocations.pharmacies.length
                    : nearbyLocations.busStops.length;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryButton,
                  isSelected && { borderColor: item.color, backgroundColor: "#ffffff" },
                ]}
                onPress={() =>
                  setSelectedFilter((current) => (current === key ? "all" : key))
                }
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                    size={24}
                  color={item.color}
                />
                <Text style={styles.categoryText}>{item.title}</Text>
                <Text style={styles.categoryCount}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.emergencyWrapper}>
          <View style={styles.rowBetweenCompact}>
            <Text style={styles.emergencyTitle}>Emergency Contact</Text>
          </View>

          <View style={styles.emergencyGrid}>
            {[
              { label: "Women", icon: "shield-account", number: "1091" },
              { label: "Ambulance", icon: "ambulance", number: "102" },
              { label: "Fire", icon: "fire-truck", number: "101" },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.emergencyCard}
                onPress={() => handleCall(item.number)}
              >
                <View style={styles.emergencyIconBox}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.emergencyLabel}>{item.label}</Text>
                <Text style={styles.emergencyNumber}>{item.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.listenCard}>
          <View style={styles.rowBetweenCompact}>
            <View style={styles.rowCenter}>
              <View style={styles.listenIconBox}>
                <Ionicons name="volume-high-outline" size={18} color="#ffffff" />
              </View>
              <Text style={styles.listenTitle}>Background Listen</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleBackgroundListening(!isBackgroundListening)}
              style={[
                styles.toggleOuter,
                {
                  backgroundColor: isBackgroundListening ? "#0f766e" : "#d1d5db",
                },
              ]}
            >
              <View
                style={[
                  styles.toggleInner,
                  {
                    alignSelf: isBackgroundListening ? "flex-end" : "flex-start",
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sosSection}>
          <TouchableOpacity
            style={[styles.sosButton, !hasTrustedContacts && styles.sosButtonDisabled]}
            onPress={handlePress}
            disabled={sosLoading}
            activeOpacity={hasTrustedContacts ? 0.75 : 0.95}
          >
            {sosLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={34}
                  color="#ffffff"
                />
                <Text style={styles.sosText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetweenCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeSafe: {
    flex: 1,
    backgroundColor: "#e0f2fe",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  homeHeader: {
    backgroundColor: "#0f766e",
    elevation: 4,
  },
  homeHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  homeLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  homeLogoImage: {
    width: 46,
    height: 46,
  },
  homeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  homeSubtitle: {
    fontSize: 11,
    color: "#bae6fd",
  },
  homeBellBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningBanner: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
  },
  warningIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991b1b",
  },
  warningMessage: {
    fontSize: 10,
    color: "#dc2626",
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
  },
  infoCardLeft: {
    flex: 1.8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoCardRight: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
    marginTop: 2,
  },
  mapCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#ffffff",
    height: "31%",
    minHeight: 170,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  categoryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
    color: "#1e293b",
    textAlign: "center",
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  emergencyWrapper: {
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  emergencyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  emergencyCard: {
    width: "31%",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  emergencyIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  emergencyLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  emergencyNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b91c1c",
    marginTop: 1,
  },
  listenCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  listenIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  listenTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  toggleOuter: {
    width: 46,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  sosSection: {
    alignItems: "center",
  },
  sosButton: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  sosButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
  },
  sosText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 2,
  },
});
