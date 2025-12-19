// app/login.tsx
// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth, isAuthenticated, fetchTrustedContacts } = useAuthStore();

  const API_BASE_URL = "https://bntjhcxw-3000.inc1.devtunnels.ms/api";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        identifier,
        password,
      });

      const data = response.data;

      if (data.success) {
        // Save auth to global store
        await setAuth(data.data, data.token);

        // Fetch trusted contacts after login
        await fetchTrustedContacts(true);

        // Check if user needs to set trusted contacts
        if (!data.data.setTrustedContacts) {
          Alert.alert(
            "Setup Required",
            "Please set up your trusted contacts before using the app.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(tabs)/contact"),
              },
            ]
          );
        } else {
          Alert.alert("Success", "Login successful", [
            {
              text: "OK",
              onPress: () => router.replace("/(tabs)/home"),
            },
          ]);
        }
      } else {
        Alert.alert("Login Failed", data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginSafe}>
      <View style={styles.loginContainer}>
        <View style={styles.loginHeader}>
          <View style={styles.loginLogoBox}>
            <MaterialCommunityIcons
              name="shield-check"
              size={48}
              color="#ffffff"
            />
          </View>
          <Text style={styles.loginTitle}>Suraksha – The Safety App</Text>
          <Text style={styles.loginSubtitle}>Your safety, our priority</Text>
        </View>

        <View style={styles.loginCard}>
          {/* Email / Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabelLight}>Email or Phone Number</Text>
            <View style={styles.inputWrapperGlass}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#5eead4"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter email or phone"
                placeholderTextColor="#e5e7eb"
                style={styles.inputGlass}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabelLight}>Password</Text>
            <View style={styles.inputWrapperGlass}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#5eead4"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#e5e7eb"
                secureTextEntry={!showPassword}
                style={styles.inputGlass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#5eead4"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryGradientButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryGradientText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.linkLight}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.footerLightText}>
              New user?{" "}
              <Text style={{ color: "#5eead4", fontWeight: "700" }}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginSafe: {
    flex: 1,
    backgroundColor: "#020617",
  },
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  loginHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  loginLogoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#14b8a6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    elevation: 8,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 15,
    color: "#a5f3fc",
    marginTop: 4,
  },
  loginCard: {
    backgroundColor: "rgba(15,23,42,0.6)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabelLight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  inputWrapperGlass: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(148,163,184,0.8)",
    paddingHorizontal: 10,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  inputIcon: {
    marginRight: 6,
  },
  inputGlass: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: "#ffffff",
  },
  eyeIcon: {
    paddingHorizontal: 4,
  },
  primaryGradientButton: {
    marginTop: 6,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#14b8a6",
  },
  primaryGradientText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  linkLight: {
    marginTop: 12,
    textAlign: "center",
    color: "#5eead4",
    fontWeight: "600",
  },
  dividerLine: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.7)",
    marginVertical: 12,
  },
  footerLightText: {
    color: "#e5e7eb",
    textAlign: "center",
    fontSize: 14,
  },
});
