// app/(tabs)/home.tsx
// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const [backgroundListen, setBackgroundListen] = useState(false);

  return (
    <SafeAreaView style={styles.homeSafe}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderInner}>
          <View style={styles.rowCenter}>
            <View style={styles.homeLogoBox}>
              <MaterialCommunityIcons name="shield-check" size={28} color="#ffffff" />
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

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* SOS */}
        <View style={styles.centerSection}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.sosPulse} />
            <TouchableOpacity style={styles.sosButton}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={72}
                color="#ffffff"
              />
              <Text style={styles.sosText}>SOS</Text>
              <View style={styles.sosPhoneBadge}>
                <Ionicons name="call-outline" size={26} color="#dc2626" />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.sosHint}>Press and hold for emergency</Text>
        </View>

        {/* Background Listen */}
        <View style={styles.listenCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <View style={styles.listenIconBox}>
                <Ionicons name="volume-high-outline" size={26} color="#ffffff" />
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
                { backgroundColor: backgroundListen ? '#0f766e' : '#d1d5db' },
              ]}
            >
              <View
                style={[
                  styles.toggleInner,
                  { alignSelf: backgroundListen ? 'flex-end' : 'flex-start' },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearest Location */}
        <View style={styles.cardWhite}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Nearest Location</Text>
            <Ionicons name="chevron-forward-outline" size={22} color="#9ca3af" />
          </View>

          <View style={styles.gridRow}>
            {[
              {
                label: 'Police Station',
                icon: 'shield-home',
                colorFrom: '#3b82f6',
                colorBg: '#eff6ff',
              },
              {
                label: 'Hospital',
                icon: 'hospital-building',
                colorFrom: '#ef4444',
                colorBg: '#fee2e2',
              },
              {
                label: 'Pharmacy',
                icon: 'medical-bag',
                colorFrom: '#22c55e',
                colorBg: '#dcfce7',
              },
              {
                label: 'Bus Stop',
                icon: 'bus-stop',
                colorFrom: '#f97316',
                colorBg: '#ffedd5',
              },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.locationCard, { backgroundColor: item.colorBg }]}
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
              { label: 'Women Help', icon: 'shield-woman', number: '1091' },
              { label: 'Ambulance', icon: 'ambulance', number: '102' },
              { label: 'Fire Brigade', icon: 'fire-truck', number: '101' },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.emergencyCard}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  homeSafe: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  homeHeader: {
    backgroundColor: '#0f766e',
    elevation: 4,
  },
  homeHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeLogoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  homeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  homeSubtitle: {
    fontSize: 11,
    color: '#bae6fd',
  },
  homeBellBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosPulse: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(248,113,113,0.2)',
  },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    elevation: 10,
  },
  sosText: {
    fontSize: 34,
    color: '#ffffff',
    fontWeight: '900',
    marginTop: 4,
  },
  sosPhoneBadge: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  sosHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  listenCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  listenIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  listenSubtitle: {
    fontSize: 11,
    color: '#4b5563',
  },
  toggleOuter: {
    width: 60,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  locationCard: {
    width: '48%',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    alignItems: 'center',
  },
  locationIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  emergencyWrapper: {
    backgroundColor: '#fee2e2',
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
    elevation: 4,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  emergencyPulseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
  },
  emergencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emergencyCard: {
    width: '30%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    elevation: 3,
    alignItems: 'center',
  },
  emergencyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emergencyLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  emergencyNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
    marginTop: 2,
  },
});
