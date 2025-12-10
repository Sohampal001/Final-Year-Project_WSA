// app/(tabs)/nearest_user.tsx
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function NearestUserScreen() {
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    let subscription: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setUserLocation(current.coords);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
        },
        loc => setUserLocation(loc.coords)
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const region = {
    latitude: userLocation ? userLocation.latitude : 22.5726,
    longitude: userLocation ? userLocation.longitude : 88.3639,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const nearbyUsers = userLocation
    ? [
        {
          name: 'Anita',
          coords: {
            latitude: userLocation.latitude + 0.001,
            longitude: userLocation.longitude + 0.001,
          },
        },
        {
          name: 'Priya',
          coords: {
            latitude: userLocation.latitude - 0.001,
            longitude: userLocation.longitude + 0.001,
          },
        },
        {
          name: 'Sneha',
          coords: {
            latitude: userLocation.latitude - 0.001,
            longitude: userLocation.longitude - 0.001,
          },
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.nearSafe}>
      <View style={styles.nearHeader}>
        <View style={styles.nearHeaderInner}>
          <Text style={styles.nearTitle}>Nearest Users</Text>
          <Text style={styles.nearSubtitle}>
            {nearbyUsers.length} users nearby • Real-time tracking
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
        >
          {['Anita – 120 m', 'Priya – 200 m', 'Sneha – 350 m'].map((txt, idx) => (
            <View key={idx} style={styles.nearChip}>
              <View style={styles.nearChipDot} />
              <Text style={styles.nearChipName}>{txt}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.mapCard}>
          <MapView style={styles.mapView} region={region}>
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
              <View style={styles.mapMarkerUserOuter}>
                <View style={styles.mapMarkerUserInner}>
                  <Ionicons name="location-sharp" size={18} color="#ffffff" />
                </View>
                <View style={styles.mapMarkerLabel}>
                  <Text style={styles.mapMarkerLabelText}>You</Text>
                </View>
              </View>
            </Marker>

            {nearbyUsers.map((u, idx) => (
              <Marker key={idx} coordinate={u.coords}>
                <View style={styles.mapMarkerOtherOuter}>
                  <View style={styles.mapMarkerOtherInner}>
                    <Ionicons name="person-outline" size={16} color="#ffffff" />
                  </View>
                  <View style={styles.mapMarkerLabel}>
                    <Text style={styles.mapMarkerLabelText}>{u.name}</Text>
                  </View>
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlBtn}>
              <Text style={styles.mapControlText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlBtn}>
              <Text style={styles.mapControlText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlBtn}>
              <Ionicons name="locate-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>
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
  nearSafe: {
    flex: 1,
    backgroundColor: '#e0f2fe',
  },
  nearHeader: {
    backgroundColor: '#06b6d4',
    elevation: 4,
  },
  nearHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nearTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  nearSubtitle: {
    fontSize: 12,
    color: '#cffafe',
  },
  nearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  nearChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#bbf7d0',
    marginRight: 6,
  },
  nearChipName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  mapCard: {
    height: 340,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#cbd5f5',
  },
  mapView: {
    flex: 1,
  },
  mapMarkerUserOuter: {
    alignItems: 'center',
  },
  mapMarkerUserInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerOtherOuter: {
    alignItems: 'center',
  },
  mapMarkerOtherInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerLabel: {
    marginTop: 3,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mapMarkerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    alignItems: 'center',
  },
  mapControlBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 2,
  },
  mapControlText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
});
