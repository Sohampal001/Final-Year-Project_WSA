// app/(tabs)/profile.tsx
// @ts-nocheck
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.profileSafe}>
      <View style={styles.profileHeaderBar}>
        <View style={styles.profileHeaderInner}>
          <Text style={styles.profileHeaderTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={styles.profileTop}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person-outline" size={48} color="#ffffff" />
          </View>
          <TouchableOpacity style={styles.profileChangeRow}>
            <Ionicons name="camera-outline" size={18} color="#0f766e" />
            <Text style={styles.profileChangeText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          {[
            { label: "Name", value: user?.name || "N/A" },
            { label: "Phone Number", value: user?.mobile || "N/A" },
            { label: "Email ID", value: user?.email || "N/A" },
            {
              label: "Aadhar Card Number",
              value: user?.aadhaarNumber
                ? `XXXX XXXX ${user.aadhaarNumber.slice(-4)}`
                : "Not Added",
            },
            { label: "Home Address", value: user?.homeAddress || "Not Added" },
            { label: "Work Address", value: user?.workAddress || "Not Added" },
            {
              label: "Email Verified",
              value: user?.isEmailVerified ? "✓ Verified" : "✗ Not Verified",
            },
            {
              label: "Aadhaar Verified",
              value: user?.isAadhaarVerified ? "✓ Verified" : "✗ Not Verified",
            },
          ].map((f, idx, arr) => (
            <View
              key={idx}
              style={[
                styles.profileFieldRow,
                idx === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.profileFieldLabel}>{f.label}</Text>
              <Text style={styles.profileFieldValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.profileEditButton}>
          <MaterialIcons name="edit" size={20} color="#ffffff" />
          <Text style={styles.profileEditText}>Edit Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
  profileSafe: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  profileHeaderBar: {
    backgroundColor: "#bbf7d0",
    elevation: 4,
  },
  profileHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  profileTop: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  profileChangeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileChangeText: {
    marginLeft: 6,
    color: "#0f766e",
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    elevation: 4,
  },
  profileFieldRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 2,
  },
  profileFieldValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  profileEditButton: {
    borderRadius: 18,
    backgroundColor: "#0f766e",
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    marginBottom: 12,
  },
  profileEditText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },
  logoutButton: {
    borderRadius: 18,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },
});
