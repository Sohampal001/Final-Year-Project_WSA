// app/(tabs)/home.tsx
// @ts-nocheck
import sendSMS from "@/api/smsApi";
import {
  getNearbyPlacesByCategory,
  getNearbyPlaces,
  NearbyPlace,
  formatDistance,
} from "@/api/nearbyPlacesApi";
import { useLocationStore } from "@/store/useLocationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";

export default function HomeScreen() {
  const [backgroundListen, setBackgroundListen] = useState(false);
  const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(
    null
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const location = useLocationStore((state) => state.location);
  const { user, trustedContacts } = useAuthStore();
  const router = useRouter();

  // Check if user has trusted contacts
  const hasTrustedContacts = trustedContacts && trustedContacts.length > 0;

  const handlePress = async () => {
    try {
      // Check if location is available
      if (!location?.lat || !location?.lon) {
        Alert.alert(
          "Location Required",
          "Please enable location services to send emergency alerts."
        );
        return;
      }

      // Check if user has trusted contacts
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
          ]
        );
        return;
      }

      // Confirm SOS action
      Alert.alert(
        "🚨 Send Emergency Alert?",
        "This will send SMS alerts to all your trusted contacts with your current location.",
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
                // Extract phone numbers from trusted contacts
                const phoneNumbers = trustedContacts.map(
                  (contact) => contact.mobile
                );

                console.log("🚨 Sending SOS to contacts:", phoneNumbers);

                const response = await sendSMS(location, phoneNumbers);

                if (response.success) {
                  Alert.alert(
                    "✅ Alert Sent",
                    `Emergency alerts sent to ${
                      response.data?.smsCount || phoneNumbers.length
                    } contacts${
                      response.data?.emailSent ? " and guardian email" : ""
                    }.`,
                    [{ text: "OK" }]
                  );
                } else {
                  throw new Error(response.message || "Failed to send alerts");
                }
              } catch (error) {
                console.error("❌ SOS Error:", error);
                Alert.alert(
                  "Error",
                  error.message ||
                    "Failed to send emergency alerts. Please try again."
                );
              } finally {
                setSosLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in handlePress:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleLocationCardPress = async (type: string) => {
    if (!location?.latitude || !location?.longitude) {
      Alert.alert("Error", "Location not available");
      return;
    }

    setSelectedPlaceType(type);
    setLoading(true);
    setModalVisible(true);

    try {
      const typeMap: {
        [key: string]: "police" | "hospital" | "pharmacy" | "bus_station";
      } = {
        "Police Station": "police",
        Hospital: "hospital",
        Pharmacy: "pharmacy",
        "Bus Stop": "bus_station",
      };

      const places = await getNearbyPlaces(
        location.latitude,
        location.longitude,
        typeMap[type],
        5000,
        10
      );
      setNearbyPlaces(places);
    } catch (error: any) {
      console.error("Error fetching nearby places:", error);
      Alert.alert("Error", error.message || "Failed to fetch nearby places");
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  const handleDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const closeModal = () => {
    setModalVisible(false);
    setNearbyPlaces([]);
    setSelectedPlaceType(null);
  };

  return (
    <SafeAreaView style={styles.homeSafe}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderInner}>
          <View style={styles.rowCenter}>
            <View style={styles.homeLogoBox}>
              <MaterialCommunityIcons
                name="shield-check"
                size={28}
                color="#ffffff"
              />
            </View>
            <View>
              <Text style={styles.homeTitle}>Suraksha – The Safety App</Text>
              <Text style={styles.homeSubtitle}>Stay Safe, Stay Connected</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.homeBellBox}>
            <Ionicons name="notifications-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trusted Contacts Warning Banner */}
      {(!user?.setTrustedContacts ||
        !trustedContacts ||
        trustedContacts.length === 0) && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push("/(tabs)/contact")}
          activeOpacity={0.8}
        >
          <View style={styles.warningIconBox}>
            <Ionicons name="warning" size={24} color="#dc2626" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>No Trusted Contacts Set</Text>
            <Text style={styles.warningMessage}>
              Add at least one trusted contact for emergency situations
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#dc2626" />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* SOS */}
        <View style={styles.centerSection}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            {hasTrustedContacts && <View style={styles.sosPulse} />}
            <TouchableOpacity
              style={[
                styles.sosButton,
                !hasTrustedContacts && styles.sosButtonDisabled,
              ]}
              onPress={handlePress}
              disabled={sosLoading}
              activeOpacity={hasTrustedContacts ? 0.7 : 0.95}
            >
              {sosLoading ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={72}
                    color="#ffffff"
                  />
                  <Text style={styles.sosText}>SOS</Text>
                  <View
                    style={[
                      styles.sosPhoneBadge,
                      !hasTrustedContacts && styles.sosPhoneBadgeDisabled,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={26}
                      color={hasTrustedContacts ? "#dc2626" : "#9ca3af"}
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.sosHint}>
            {hasTrustedContacts
              ? "Press for emergency"
              : "Add trusted contacts to activate"}
          </Text>
        </View>

        {/* Background Listen */}
        <View style={styles.listenCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <View style={styles.listenIconBox}>
                <Ionicons
                  name="volume-high-outline"
                  size={26}
                  color="#ffffff"
                />
              </View>
              <View>
                <Text style={styles.listenTitle}>Background Listen</Text>
                <Text style={styles.listenSubtitle}>Real-time monitoring</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setBackgroundListen(!backgroundListen)}
              style={[
                styles.toggleOuter,
                { backgroundColor: backgroundListen ? "#0f766e" : "#d1d5db" },
              ]}
            >
              <View
                style={[
                  styles.toggleInner,
                  { alignSelf: backgroundListen ? "flex-end" : "flex-start" },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearest Location */}
        <View style={styles.cardWhite}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Nearest Location</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color="#9ca3af"
            />
          </View>

          <View style={styles.gridRow}>
            {[
              {
                label: "Police Station",
                icon: "shield-home",
                colorFrom: "#3b82f6",
                colorBg: "#eff6ff",
              },
              {
                label: "Hospital",
                icon: "hospital-building",
                colorFrom: "#ef4444",
                colorBg: "#fee2e2",
              },
              {
                label: "Pharmacy",
                icon: "medical-bag",
                colorFrom: "#22c55e",
                colorBg: "#dcfce7",
              },
              {
                label: "Bus Stop",
                icon: "bus-stop",
                colorFrom: "#f97316",
                colorBg: "#ffedd5",
              },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.locationCard, { backgroundColor: item.colorBg }]}
                onPress={() => handleLocationCardPress(item.label)}
              >
                <View
                  style={[
                    styles.locationIconBox,
                    { backgroundColor: item.colorFrom },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={26}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.locationLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyWrapper}>
          <View style={styles.rowBetween}>
            <Text style={styles.emergencyTitle}>Emergency Contact</Text>
            <View style={styles.emergencyPulseDot} />
          </View>

          <View style={styles.emergencyGrid}>
            {[
              { label: "Women Help", icon: "shield-account", number: "1091" },
              { label: "Ambulance", icon: "ambulance", number: "102" },
              { label: "Fire Brigade", icon: "fire-truck", number: "101" },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.emergencyCard}
                onPress={() => handleCall(item.number)}
              >
                <View style={styles.emergencyIconBox}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={26}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.emergencyLabel}>{item.label}</Text>
                <Text style={styles.emergencyNumber}>{item.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal for nearby places */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nearby {selectedPlaceType}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f766e" />
                <Text style={styles.loadingText}>Finding nearby places...</Text>
              </View>
            ) : nearbyPlaces.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No places found nearby</Text>
              </View>
            ) : (
              <ScrollView style={styles.placesList}>
                {nearbyPlaces.map((place, idx) => (
                  <View key={place.place_id || idx} style={styles.placeCard}>
                    <View style={styles.placeHeader}>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        {place.distance !== undefined && (
                          <View style={styles.distanceBadge}>
                            <Ionicons
                              name="location"
                              size={12}
                              color="#6b7280"
                            />
                            <Text style={styles.distanceText}>
                              {formatDistance(place.distance)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {place.rating && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={14} color="#f59e0b" />
                          <Text style={styles.ratingText}>{place.rating}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.placeAddress}>{place.address}</Text>

                    {place.isOpen !== undefined && (
                      <Text
                        style={[
                          styles.openStatus,
                          { color: place.isOpen ? "#059669" : "#dc2626" },
                        ]}
                      >
                        {place.isOpen ? "Open Now" : "Closed"}
                      </Text>
                    )}

                    <View style={styles.placeActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                          handleDirections(
                            place.location.lat,
                            place.location.lng
                          )
                        }
                      >
                        <Ionicons name="navigate" size={20} color="#3b82f6" />
                        <Text style={styles.actionButtonText}>Directions</Text>
                      </TouchableOpacity>

                      {place.contactNumber && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.callButton]}
                          onPress={() => handleCall(place.contactNumber!)}
                        >
                          <Ionicons name="call" size={20} color="#10b981" />
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: "#10b981" },
                            ]}
                          >
                            Call
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  warningBanner: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  warningIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 2,
  },
  warningMessage: {
    fontSize: 12,
    color: "#dc2626",
    lineHeight: 16,
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
  sosPulse: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(248,113,113,0.2)",
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffffff",
    elevation: 10,
  },
  sosButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
    elevation: 4,
  },
  sosText: {
    fontSize: 34,
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 4,
  },
  sosPhoneBadge: {
    position: "absolute",
    right: -10,
    bottom: -10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  sosPhoneBadgeDisabled: {
    backgroundColor: "#f3f4f6",
    elevation: 2,
  },
  sosHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  listenCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },
  listenIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  listenTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  listenSubtitle: {
    fontSize: 11,
    color: "#4b5563",
  },
  toggleOuter: {
    width: 60,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: "center",
  },
  toggleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  cardWhite: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  locationCard: {
    width: "48%",
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    alignItems: "center",
  },
  locationIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  emergencyWrapper: {
    backgroundColor: "#fee2e2",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "#fecaca",
    elevation: 4,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  emergencyPulseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
  },
  emergencyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emergencyCard: {
    width: "30%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    elevation: 3,
    alignItems: "center",
  },
  emergencyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emergencyLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  emergencyNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b91c1c",
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
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
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  placesList: {
    flex: 1,
    padding: 16,
  },
  placeCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  placeInfo: {
    flex: 1,
    marginRight: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
    marginLeft: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 18,
  },
  openStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  placeActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  callButton: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
    marginLeft: 6,
  },
});
