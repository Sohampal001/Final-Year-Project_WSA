// app/signup.tsx
// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  const Input = ({
    label,
    icon,
    placeholder,
    keyboardType = 'default',
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
        />
      </View>
    </View>
  );

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
            style={[
              styles.progressDot,
              step >= i && styles.progressDotActive,
            ]}
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
            <Input label="Full Name" icon="person-outline" placeholder="Your name" />
            <Input
              label="Email ID"
              icon="mail-outline"
              placeholder="your@email.com"
              keyboardType="email-address"
            />
            <Input
              label="Phone Number"
              icon="call-outline"
              placeholder="Mobile number"
              keyboardType="phone-pad"
            />
            <Input label="OTP" icon="key-outline" placeholder="Enter OTP" />

            <View style={styles.singleBtn}>
              <TouchableOpacity style={styles.nextBtn} onPress={next}>
                <Text style={styles.btnText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 2 ---------- */}
        {step === 2 && (
          <>
            <Header
              title="Aadhaar Details"
              subtitle="Identity verification"
            />
            <Input
              label="Aadhaar Number"
              icon="card-outline"
              placeholder="XXXX XXXX XXXX"
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextBtn} onPress={next}>
                <Text style={styles.btnText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
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
            />
            <Input
              label="Guardian Email"
              icon="mail-outline"
              placeholder="guardian@email.com"
            />
            <Input
              label="Guardian Phone"
              icon="call-outline"
              placeholder="Phone number"
              keyboardType="phone-pad"
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextBtn} onPress={next}>
                <Text style={styles.btnText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- STEP 4 ---------- */}
        {step === 4 && (
          <>
            <Header
              title="Address Details"
              subtitle="Location information"
            />
            <Input
              label="Home Address"
              icon="home-outline"
              placeholder="Home address"
            />
            <Input
              label="Work Address"
              icon="business-outline"
              placeholder="Work address"
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextBtn} onPress={next}>
                <Text style={styles.btnText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
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
            />

            <View style={styles.doubleBtn}>
              <TouchableOpacity style={styles.backBtn} onPress={back}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
                <Text style={styles.btnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => router.replace('/(tabs)/home')}
              >
                <Text style={styles.btnText}>Sign Up</Text>
                <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#a5f3fc',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#14b8a6',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 10,
    backgroundColor: '#0f172a',
  },
  input: {
    flex: 1,
    height: 42,
    color: '#ffffff',
    marginLeft: 6,
  },
  singleBtn: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  doubleBtn: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
