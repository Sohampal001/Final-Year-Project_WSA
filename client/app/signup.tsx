// app/signup.tsx
// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/useAuthStore";

// Input component moved outside to prevent re-renders
const Input = ({
  label,
  icon,
  placeholder,
  keyboardType = "default",
  value,
  onChangeText,
  secureTextEntry = false,
}: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputBox}>
      <Ionicons name={icon} size={18} color="#5eead4" />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  </View>
);

export default function SignUpScreen() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpType, setOtpType] = useState("");

  // Step 1: Basic Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [userId, setUserId] = useState("");

  // Step 2: Aadhar Details
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");

  // Step 3: Guardian Details
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Step 4: Address Details
  const [homeAddress, setHomeAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");

  // Step 5: Security Code
  const [codeWord, setCodeWord] = useState("");

  // Use 10.0.2.2 for Android emulator (localhost maps to the emulator, not host machine)
  // For physical device, replace with your machine's IP address (e.g., 'http://192.168.1.x:3000/api')
  const API_BASE_URL = "https://bntjhcxw-3000.inc1.devtunnels.ms/api";

  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  // Step 1: Signup and Email Verification
  const handleStep1Signup = async () => {
    if (!name || !email || !mobile || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      // Signup
      const signupResponse = await fetch(`${API_BASE_URL}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password }),
      });

      const signupData = await signupResponse.json();

      if (!signupData.success) {
        Alert.alert("Signup Failed", signupData.message);
        setLoading(false);
        return;
      }

      // Store token and user ID in global state
      const token = signupData.token;
      const userIdFromResponse = signupData.data._id;
      setAuthToken(token);
      setUserId(userIdFromResponse);

      // Save to auth store
      await setAuth(signupData.data, token);

      // Send OTP to email
      const otpResponse = await fetch(`${API_BASE_URL}/users/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, type: "EMAIL_VERIFICATION" }),
      });

      const otpData = await otpResponse.json();

      if (otpData.success) {
        setOtpType("EMAIL_VERIFICATION");
        setShowOTPModal(true);
      } else {
        Alert.alert("Error", otpData.message);
      }
    } catch (error) {
      console.error("Step 1 Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const verifyEmailOTP = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/verify-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ otp, type: otpType }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Email verified successfully");
        setShowOTPModal(false);
        setOtp("");
        next(); // Move to step 2
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error("Verify OTP Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Aadhar Verification
  const handleStep2Aadhar = async () => {
    if (!aadhaarNumber) {
      Alert.alert("Error", "Please enter Aadhaar number");
      return;
    }

    if (aadhaarNumber.replace(/\s/g, "").length !== 12) {
      Alert.alert("Error", "Aadhaar number must be 12 digits");
      return;
    }

    setLoading(true);
    try {
      // Send OTP for Aadhaar verification
      const response = await fetch(`${API_BASE_URL}/users/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email, type: "AADHAAR" }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpType("AADHAAR");
        setShowOTPModal(true);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error("Aadhaar OTP Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Aadhaar OTP and save Aadhaar
  const verifyAadhaarOTP = async () => {
    if (!aadhaarOtp) {
      Alert.alert("Error", "Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      // Verify OTP
      const otpResponse = await fetch(
        `${API_BASE_URL}/users/verify-email-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ otp: aadhaarOtp, type: "AADHAAR" }),
        }
      );

      const otpData = await otpResponse.json();

      if (!otpData.success) {
        Alert.alert("Error", otpData.message);
        setLoading(false);
        return;
      }

      // Update user with Aadhaar number
      const updateResponse = await fetch(
        `${API_BASE_URL}/users/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            aadhaarNumber: aadhaarNumber.replace(/\s/g, ""),
            isAadhaarVerified: true,
          }),
        }
      );

      const updateData = await updateResponse.json();

      if (updateData.success) {
        Alert.alert("Success", "Aadhaar verified successfully");
        setShowOTPModal(false);
        setAadhaarOtp("");
        next(); // Move to step 3
      } else {
        Alert.alert("Error", updateData.message);
      }
    } catch (error) {
      console.error("Verify Aadhaar Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save Guardian Details
  const handleStep3Guardian = async () => {
    if (!guardianName || !guardianEmail || !guardianPhone) {
      Alert.alert("Error", "Please fill all guardian details");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/guardian`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: guardianName,
          email: guardianEmail,
          mobile: guardianPhone,
          relationship: "Guardian",
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Guardian details saved");
        next(); // Move to step 4
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error("Guardian Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Save Address Details
  const handleStep4Address = async () => {
    if (!homeAddress && !workAddress) {
      Alert.alert("Error", "Please provide at least one address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          homeAddress,
          workAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Address details saved");
        next(); // Move to step 5
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error("Address Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Save Code Word and Complete Signup
  const handleStep5CodeWord = async () => {
    if (!codeWord) {
      Alert.alert("Error", "Please enter a code word");
      return;
    }

    if (codeWord.length < 3) {
      Alert.alert("Error", "Code word must be at least 3 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/codeword/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ codeWord }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Signup completed successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ]);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      console.error("Code Word Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const Header = ({ title, subtitle }: any) => (
    <View style={styles.header}>
      <MaterialCommunityIcons name="shield-check" size={46} color="#ffffff" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.progressDot, step >= i && styles.progressDotActive]}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---------- STEP 1 ---------- */}
        {step === 1 && (
          <>
            <Header
              title="Basic Details"
              subtitle="Enter your personal information"
            />
            <Input
              label="Full Name"
              icon="person-outline"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Email ID"
              icon="mail-outline"
              placeholder="your@email.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Phone Number"
              icon="call-outline"
              placeholder="Mobile number"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
            <Input
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter password"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.singleBtn}>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleStep1Signup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Sign Up & Verify Email</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 2 ---------- */}
        {step === 2 && (
          <>
            <Header title="Aadhaar Details" subtitle="Identity verification" />
            <Input
              label="Aadhaar Number"
              icon="card-outline"
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              value={aadhaarNumber}
              onChangeText={setAadhaarNumber}
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleStep2Aadhar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Verify Aadhaar</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 3 ---------- */}
        {step === 3 && (
          <>
            <Header
              title="Guardian Details"
              subtitle="Emergency contact person"
            />
            <Input
              label="Guardian Name"
              icon="person-outline"
              placeholder="Guardian name"
              value={guardianName}
              onChangeText={setGuardianName}
            />
            <Input
              label="Guardian Email"
              icon="mail-outline"
              placeholder="guardian@email.com"
              keyboardType="email-address"
              value={guardianEmail}
              onChangeText={setGuardianEmail}
            />
            <Input
              label="Guardian Phone"
              icon="call-outline"
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={guardianPhone}
              onChangeText={setGuardianPhone}
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleStep3Guardian}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 4 ---------- */}
        {step === 4 && (
          <>
            <Header title="Address Details" subtitle="Location information" />
            <Input
              label="Home Address"
              icon="home-outline"
              placeholder="Home address"
              value={homeAddress}
              onChangeText={setHomeAddress}
            />
            <Input
              label="Work Address"
              icon="business-outline"
              placeholder="Work address"
              value={workAddress}
              onChangeText={setWorkAddress}
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleStep4Address}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 5 ---------- */}
        {step === 5 && (
          <>
            <Header
              title="Security Code"
              subtitle="Set your secret code word"
            />
            <Input
              label="Code Word"
              icon="lock-closed-outline"
              placeholder="Example: helpme"
              value={codeWord}
              onChangeText={setCodeWord}
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleStep5CodeWord}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Complete Signup</Text>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color="#ffffff"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* OTP Modal */}
        <Modal
          visible={showOTPModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOTPModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <MaterialCommunityIcons
                name="email-check"
                size={60}
                color="#14b8a6"
              />
              <Text style={styles.modalTitle}>Enter OTP</Text>
              <Text style={styles.modalSubtitle}>
                {otpType === "EMAIL_VERIFICATION"
                  ? "We sent an OTP to your email for verification"
                  : "We sent an OTP to your email for Aadhaar verification"}
              </Text>

              <View style={styles.otpInputBox}>
                <TextInput
                  placeholder="Enter OTP"
                  placeholderTextColor="#9ca3af"
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  value={otpType === "EMAIL_VERIFICATION" ? otp : aadhaarOtp}
                  onChangeText={
                    otpType === "EMAIL_VERIFICATION" ? setOtp : setAadhaarOtp
                  }
                  maxLength={6}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setShowOTPModal(false);
                    setOtp("");
                    setAadhaarOtp("");
                  }}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalVerifyBtn}
                  onPress={
                    otpType === "EMAIL_VERIFICATION"
                      ? verifyEmailOTP
                      : verifyAadhaarOTP
                  }
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.btnText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#a5f3fc",
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#334155",
  },
  progressDotActive: {
    backgroundColor: "#14b8a6",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#334155",
    paddingHorizontal: 10,
    backgroundColor: "#0f172a",
  },
  input: {
    flex: 1,
    height: 42,
    color: "#ffffff",
    marginLeft: 6,
  },
  singleBtn: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  doubleBtn: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14b8a6",
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 10,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#a5f3fc",
    textAlign: "center",
    marginBottom: 20,
  },
  otpInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#334155",
    paddingHorizontal: 15,
    backgroundColor: "#020617",
    width: "100%",
    marginBottom: 20,
  },
  otpInput: {
    flex: 1,
    height: 50,
    color: "#ffffff",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  modalVerifyBtn: {
    flex: 1,
    backgroundColor: "#14b8a6",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
  },
});
