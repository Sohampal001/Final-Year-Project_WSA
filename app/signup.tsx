// app/signup.tsx
// @ts-nocheck
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const router = useRouter();

  const fields = [
    { label: 'Name', icon: 'person-outline', type: 'default' },
    { label: 'Phone Number', icon: 'call-outline', type: 'phone-pad' },
    { label: 'Email ID', icon: 'mail-outline', type: 'email-address' },
    { label: 'Aadhar Card Number', icon: 'card-outline', type: 'default' },
    { label: 'Guardian Name', icon: 'person-circle-outline', type: 'default' },
    { label: 'Guardian Phone Number', icon: 'call-outline', type: 'phone-pad' },
    { label: 'Code Word', icon: 'key-outline', type: 'default' },
    { label: 'Password', icon: 'lock-closed-outline', type: 'default', secure: true },
    {
      label: 'Retype Password',
      icon: 'lock-closed-outline',
      type: 'default',
      secure: true,
    },
  ];

  return (
    <SafeAreaView style={styles.signupSafe}>
      <ScrollView contentContainerStyle={styles.signupScroll}>
        <View style={styles.signupHeader}>
          <View style={styles.signupLogoBox}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#ffffff" />
          </View>
          <Text style={styles.signupTitle}>Create Account</Text>
          <Text style={styles.signupSubtitle}>Join Suraksha for your safety</Text>
        </View>

        <View style={styles.signupCard}>
          {fields.map((field, idx) => (
            <View key={idx} style={styles.fieldContainer}>
              <Text style={styles.fieldLabelLightSmall}>{field.label}</Text>
              <View style={styles.inputWrapperGlassSmall}>
                <Ionicons
                  name={field.icon}
                  size={18}
                  color="#5eead4"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  placeholderTextColor="#d4d4d8"
                  secureTextEntry={field.secure}
                  keyboardType={field.type}
                  style={styles.inputGlassSmall}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryGradientButton, { marginTop: 10 }]}
            onPress={() => {
              router.replace('/(tabs)/home');
            }}
          >
            <Text style={styles.primaryGradientText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.signupFooterText}>
              Already have an account?{' '}
              <Text style={{ color: '#5eead4', fontWeight: '700' }}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  signupSafe: {
    flex: 1,
    backgroundColor: '#020617',
  },
  signupScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  signupHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  signupLogoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  signupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  signupSubtitle: {
    fontSize: 13,
    color: '#a5f3fc',
  },
  signupCard: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabelLightSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  inputWrapperGlassSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.8)',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  inputIcon: {
    marginRight: 6,
  },
  inputGlassSmall: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#ffffff',
  },
  primaryGradientButton: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#14b8a6',
  },
  primaryGradientText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  signupFooterText: {
    color: '#e5e7eb',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
  },
});
