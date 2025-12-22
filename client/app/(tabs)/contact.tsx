// app/(tabs)/contact.tsx
// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useAuthStore } from "../../store/useAuthStore";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL!

const RELATIONSHIPS = [
  { label: "Select Relationship", value: "" },
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Sibling", value: "Sibling" },
  { label: "Spouse", value: "Spouse" },
  { label: "Friend", value: "Friend" },
  { label: "Other", value: "Other" },
];

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, "");

  // Remove country code if present (assuming +91 or 91)
  if (normalized.startsWith("91") && normalized.length > 10) {
    normalized = normalized.substring(2);
  }

  // Return last 10 digits
  return normalized.slice(-10);
};

export default function ContactScreen() {
  const {
    trustedContacts,
    trustedContactsLoading,
    token,
    user,
    fetchTrustedContacts,
    addTrustedContact,
    removeTrustedContact,
    updateUser,
  } = useAuthStore();

  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [relationshipModalVisible, setRelationshipModalVisible] =
    useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [allContacts, setAllContacts] = useState<any[]>([]);

  // Refetch trusted contacts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTrustedContacts(true); // Force refresh when screen is focused
    }, [fetchTrustedContacts])
  );

  // Show alert if user hasn't set trusted contacts yet
  useEffect(() => {
    // Show alert immediately when component mounts if no trusted contacts
    const timer = setTimeout(() => {
      if (
        !user?.setTrustedContacts ||
        (trustedContacts && trustedContacts.length === 0)
      ) {
        Alert.alert(
          "⚠️ Setup Required",
          "No trusted contacts are set. Please add at least one trusted contact for emergency situations. This is mandatory to use the app.",
          [
            {
              text: "Add Contact",
              onPress: () => openContactPicker(),
            },
          ],
          { cancelable: false }
        );
      }
    }, 500); // Small delay to ensure data is loaded

    return () => clearTimeout(timer);
  }, [user, trustedContacts]);

  // ----------- OPEN DEVICE CONTACT PICKER -------------
  const openContactPicker = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow contact permission in settings to add from phone contacts."
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const filtered = data.filter(
        (c) => c.phoneNumbers && c.phoneNumbers.length > 0
      );

      if (filtered.length === 0) {
        Alert.alert("No contacts", "No contacts with phone numbers found.");
        return;
      }

      setDeviceContacts(filtered);
      setSearchQuery("");
      setPickerVisible(true);
    } catch (e) {
      console.log("Error loading contacts", e);
      Alert.alert("Error", "Could not load phone contacts.");
    }
  };

  // ----------- SELECT CONTACT FROM DEVICE -------------
  // Validates contact before opening relationship selection:
  // 1. Normalizes phone numbers (removes +91 and non-digits)
  // 2. Prevents user from adding their own number
  // 3. Prevents duplicate contacts
  const handleSelectContact = (contact: any) => {
    const phone = contact.phoneNumbers[0]?.number || "";
    if (!phone) {
      Alert.alert("No number", "Selected contact has no phone number.");
      return;
    }

    const normalizedSelectedPhone = normalizePhoneNumber(phone);
    const normalizedUserPhone = user?.mobile
      ? normalizePhoneNumber(user.mobile)
      : null;

    // Check if user is trying to add their own number
    if (
      normalizedUserPhone &&
      normalizedSelectedPhone === normalizedUserPhone
    ) {
      Alert.alert(
        "Invalid Contact",
        "You cannot add your own number as a trusted contact."
      );
      return;
    }

    // Check if this contact already exists in trusted contacts
    const isDuplicate = trustedContacts?.some(
      (tc) => normalizePhoneNumber(tc.mobile) === normalizedSelectedPhone
    );

    if (isDuplicate) {
      Alert.alert(
        "Duplicate Contact",
        "This contact is already in your trusted contacts."
      );
      return;
    }

    setSelectedContact(contact);
    setPickerVisible(false);
    setSelectedRelationship("");
    setRelationshipModalVisible(true);
  };

  // ----------- ADD TRUSTED CONTACT TO BACKEND -------------
  const handleAddTrustedContact = async () => {
    if (!selectedRelationship) {
      Alert.alert("Missing Information", "Please select a relationship.");
      return;
    }

    if (!selectedContact) return;

    const phone = selectedContact.phoneNumbers[0]?.number || "";
    const name = selectedContact.name || "Unknown";

    setIsAdding(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/trusted-contacts`,
        {
          name,
          mobile: phone,
          relationship: selectedRelationship,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      if (result.success) {
        addTrustedContact(result.data);

        // Update user's setTrustedContacts flag to true
        if (!user?.setTrustedContacts) {
          updateUser({ setTrustedContacts: true });
        }

        Alert.alert(
          "Success",
          result.data.isGuardian
            ? `${name} has been added as a trusted contact and marked as Guardian!`
            : `${name} has been added as a trusted contact.`
        );
        setRelationshipModalVisible(false);
        setSelectedContact(null);
        setSelectedRelationship("");
      } else {
        // Show the specific error message from backend
        console.error("Backend error:", result.message);
        Alert.alert(
          "Cannot Add Contact",
          result.message || "Failed to add trusted contact."
        );
        setRelationshipModalVisible(false);
        setSelectedContact(null);
        setSelectedRelationship("");
      }
    } catch (error) {
      console.error("Error adding trusted contact:", error);
      Alert.alert("Error", "Failed to add trusted contact. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  // ----------- FETCH ALL CONTACTS (INCLUDING INACTIVE) -------------
  const fetchAllContacts = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trusted-contacts/all?includeInactive=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setAllContacts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching all contacts:", error);
    }
  };

  // Effect to fetch all contacts when showing inactive
  useEffect(() => {
    if (showInactive) {
      fetchAllContacts();
    }
  }, [showInactive]);

  // ----------- DEACTIVATE TRUSTED CONTACT (SOFT DELETE) -------------
  const handleDeactivateContact = async (
    contactId: string,
    contactName: string
  ) => {
    // Check if this is the last active contact
    const activeCount = trustedContacts?.filter((c) => c.isActive).length || 0;
    if (activeCount <= 1) {
      Alert.alert(
        "Cannot Deactivate",
        "You must have at least one active trusted contact. Please add another contact before deactivating this one."
      );
      return;
    }

    Alert.alert(
      "Confirm Deactivate",
      `Are you sure you want to deactivate ${contactName}? The contact will be hidden but not deleted permanently.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${API_BASE_URL}/trusted-contacts/${contactId}/deactivate`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const result = response.data;

              if (result.success) {
                // Refresh contacts after deactivation
                await fetchTrustedContacts(true);
                Alert.alert(
                  "Success",
                  "Trusted contact deactivated successfully."
                );
              } else {
                Alert.alert(
                  "Error",
                  result.message || "Failed to deactivate contact."
                );
              }
            } catch (error) {
              console.error("Error deactivating contact:", error);
              Alert.alert(
                "Error",
                "Failed to deactivate contact. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // ----------- DELETE TRUSTED CONTACT (HARD DELETE) -------------
  const handleRemoveContact = async (
    contactId: string,
    contactName: string
  ) => {
    // Check if this is the last contact
    if (trustedContacts && trustedContacts.length <= 1) {
      Alert.alert(
        "Cannot Delete",
        "You must have at least one trusted contact. Please add another contact before deleting this one."
      );
      return;
    }

    Alert.alert(
      "Confirm Permanent Delete",
      `Are you sure you want to PERMANENTLY delete ${contactName}? This action cannot be undone. Consider using 'Deactivate' instead if you want to keep the contact data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `${API_BASE_URL}/trusted-contacts/${contactId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const result = response.data;

              if (result.success) {
                removeTrustedContact(contactId);
                Alert.alert("Success", "Trusted contact deleted permanently.");
              } else {
                Alert.alert(
                  "Error",
                  result.message || "Failed to remove contact."
                );
              }
            } catch (error) {
              console.error("Error removing contact:", error);
              Alert.alert(
                "Error",
                "Failed to remove contact. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // ----------- FILTERED DEVICE CONTACTS FOR SEARCH -------------
  const filteredDeviceContacts = deviceContacts.filter((item) => {
    const phone = item.phoneNumbers?.[0]?.number || "";
    const target = (item.name || "" + phone).toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  // ----------- UI -------------
  return (
    <SafeAreaView style={styles.contactSafe}>
      {/* Header */}
      <View style={styles.contactHeader}>
        <View style={styles.contactHeaderInner}>
          <View>
            <Text style={styles.contactTitle}>Trusted Contacts</Text>
            <Text style={styles.contactSubtitle}>
              {trustedContacts?.length || 0} contact
              {trustedContacts?.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={styles.contactAddIconBox}
            onPress={openContactPicker}
          >
            <Ionicons name="add" size={26} color="#7c2d12" />
          </TouchableOpacity>
        </View>

        {/* Toggle for viewing inactive contacts */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowInactive(!showInactive)}
        >
          <Ionicons
            name={showInactive ? "eye-off" : "eye"}
            size={18}
            color="#7c2d12"
          />
          <Text style={styles.toggleText}>
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning Banner if no contacts set */}
      {!user?.setTrustedContacts &&
        (!trustedContacts || trustedContacts.length === 0) && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#b91c1c" />
            <Text style={styles.warningText}>
              You must add at least one trusted contact to use the app
            </Text>
          </View>
        )}

      {/* MAIN LIST */}
      {trustedContactsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c2d12" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (showInactive ? allContacts : trustedContacts) &&
        (showInactive ? allContacts : trustedContacts).length > 0 ? (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {(showInactive ? allContacts : trustedContacts).map((contact) => (
            <View
              key={contact._id}
              style={[
                styles.contactCard,
                !contact.isActive && styles.inactiveCard,
              ]}
            >
              {/* Left side: Avatar and contact details */}
              <View style={styles.contactLeft}>
                <View
                  style={[
                    styles.contactAvatar,
                    contact.isGuardian && styles.guardianAvatar,
                    !contact.isActive && styles.inactiveAvatar,
                  ]}
                >
                  <Ionicons
                    name={
                      contact.isGuardian ? "shield-checkmark" : "person-outline"
                    }
                    size={30}
                    color="#ffffff"
                  />
                </View>
                <View style={styles.contactDetails}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.contactName,
                        !contact.isActive && styles.inactiveText,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {contact.name}
                    </Text>
                    {contact.isGuardian && (
                      <View style={styles.guardianBadge}>
                        <Text style={styles.guardianBadgeText}>Guardian</Text>
                      </View>
                    )}
                    {!contact.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowCenter}>
                    <Ionicons
                      name="call-outline"
                      size={14}
                      color={!contact.isActive ? "#9ca3af" : "#7c3aed"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.contactPhone,
                        !contact.isActive && styles.inactiveText,
                      ]}
                      numberOfLines={1}
                    >
                      {contact.mobile}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.contactTag,
                      !contact.isActive && styles.inactiveText,
                    ]}
                  >
                    {contact.relationship}
                  </Text>
                </View>
              </View>

              {/* Right side: Action buttons - only show for active contacts */}
              {contact.isActive && (
                <View style={styles.actionButtons}>
                  {/* DEACTIVATE button */}
                  <TouchableOpacity
                    style={[
                      styles.contactDeactivateBtn,
                      trustedContacts.filter((c) => c.isActive).length <= 1 &&
                        styles.disabledBtn,
                    ]}
                    onPress={() =>
                      handleDeactivateContact(contact._id, contact.name)
                    }
                    disabled={
                      trustedContacts.filter((c) => c.isActive).length <= 1
                    }
                  >
                    <Ionicons
                      name="pause-circle-outline"
                      size={20}
                      color="#ffffff"
                    />
                  </TouchableOpacity>

                  {/* DELETE button */}
                  <TouchableOpacity
                    style={[
                      styles.contactRemoveBtn,
                      trustedContacts.filter((c) => c.isActive).length <= 1 &&
                        styles.disabledBtn,
                    ]}
                    onPress={() =>
                      handleRemoveContact(contact._id, contact.name)
                    }
                    disabled={
                      trustedContacts.filter((c) => c.isActive).length <= 1
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Trusted Contacts</Text>
          <Text style={styles.emptySubtitle}>
            Add at least one trusted contact for emergency situations
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={openContactPicker}
          >
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTACT PICKER MODAL WITH SEARCH */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#9ca3af"
              style={{ marginHorizontal: 6 }}
            />
            <TextInput
              placeholder="Search by name or number"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={filteredDeviceContacts}
            keyExtractor={(item, index) =>
              item.id || item.recordID || String(index)
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const phone = item.phoneNumbers?.[0]?.number || "";
              return (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelectContact(item)}
                >
                  <View style={styles.modalAvatar}>
                    <Ionicons name="person-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalPhone}>{phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* RELATIONSHIP SELECTION MODAL */}
      <Modal
        visible={relationshipModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRelationshipModalVisible(false)}
      >
        <View style={styles.relationshipModalOverlay}>
          <View style={styles.relationshipModalContent}>
            <Text style={styles.relationshipModalTitle}>
              Select Relationship
            </Text>
            <Text style={styles.relationshipModalSubtitle}>
              {selectedContact?.name}
            </Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedRelationship}
                onValueChange={(value) => setSelectedRelationship(value)}
                style={styles.picker}
              >
                {RELATIONSHIPS.map((rel) => (
                  <Picker.Item
                    key={rel.value}
                    label={rel.label}
                    value={rel.value}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.relationshipModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setRelationshipModalVisible(false);
                  setSelectedContact(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!selectedRelationship || isAdding) &&
                    styles.disabledAddButton,
                ]}
                onPress={handleAddTrustedContact}
                disabled={!selectedRelationship || isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.addButtonText}>Add Contact</Text>
                )}
              </TouchableOpacity>
            </View>
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
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contactSafe: {
    flex: 1,
    backgroundColor: "#fdf2f8",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  contactHeader: {
    backgroundColor: "#7c3aed",
    elevation: 4,
  },
  contactHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  contactSubtitle: {
    fontSize: 12,
    color: "#fef3c7",
  },
  warningBanner: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#991b1b",
    fontWeight: "600",
  },
  contactAddIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  contactCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  contactLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    minWidth: 0,
  },
  contactDetails: {
    flex: 1,
    minWidth: 0,
  },
  contactAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#a855f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    flexShrink: 1,
  },
  contactPhone: {
    fontSize: 13,
    color: "#4b5563",
  },
  contactTag: {
    marginTop: 4,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ede9fe",
    color: "#5b21b6",
    alignSelf: "flex-start",
  },
  contactRemoveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  disabledBtn: {
    backgroundColor: "#9ca3af",
    opacity: 0.5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 6,
  },
  guardianAvatar: {
    backgroundColor: "#059669",
  },
  guardianBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  guardianBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065f46",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    gap: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7c2d12",
  },
  inactiveCard: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    opacity: 0.8,
  },
  inactiveAvatar: {
    backgroundColor: "#9ca3af",
  },
  inactiveText: {
    color: "#6b7280",
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#991b1b",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  contactDeactivateBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c2d12",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },

  // --------- Modal styles ----------
  modalSafe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    color: "#111827",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
    elevation: 2,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  modalPhone: {
    fontSize: 13,
    color: "#4b5563",
  },

  // --------- Relationship Modal styles ----------
  relationshipModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  relationshipModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  relationshipModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  relationshipModalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  relationshipModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#7c2d12",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  disabledAddButton: {
    backgroundColor: "#9ca3af",
    opacity: 0.5,
  },
});
