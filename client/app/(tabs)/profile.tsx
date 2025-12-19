// app/(tabs)/profile.tsx
// @ts-nocheck
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.profileSafe}>
      <View style={styles.profileHeaderBar}>
        <View style={styles.profileHeaderInner}>
          <Text style={styles.profileHeaderTitle}>Profile</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={22} color="#0f172a" />
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
            { label: 'Name', value: 'Priya Sharma' },
            { label: 'Phone Number', value: '+91 9876543210' },
            { label: 'Email ID', value: 'priya.sharma@email.com' },
            { label: 'Aadhar Card Number', value: 'XXXX XXXX 1234' },
            { label: 'Guardian Name', value: 'Raj Sharma' },
            { label: 'Guardian Phone Number', value: '+91 9876543211' },
            { label: 'Code Word', value: '••••••••' },
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

        <View style={styles.profileOtpCard}>
          <Text style={styles.profileOtpText}>
            To change details, verify with OTP.
          </Text>
          <TouchableOpacity style={styles.profileOtpButton}>
            <Text style={styles.profileOtpButtonText}>Verify with OTP</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.profileEditButton}>
          <MaterialIcons name="edit" size={20} color="#ffffff" />
          <Text style={styles.profileEditText}>Edit Details</Text>
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
    backgroundColor: '#f0fdf4',
  },
  profileHeaderBar: {
    backgroundColor: '#bbf7d0',
    elevation: 4,
  },
  profileHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileChangeText: {
    marginLeft: 6,
    color: '#0f766e',
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    elevation: 4,
  },
  profileFieldRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 2,
  },
  profileFieldValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  profileOtpCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 12,
  },
  profileOtpText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  profileOtpButton: {
    borderRadius: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    alignItems: 'center',
  },
  profileOtpButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  profileEditButton: {
    borderRadius: 18,
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  profileEditText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6,
  },
});
