/**
 * Example: How to use the Location Service to find nearby users
 *
 * This example shows how to integrate the location service in your React Native components
 */

import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Button, StyleSheet } from "react-native";
import { useLocationStore } from "../store/useLocationStore";
import { getNearbyUsers } from "../api/locationApi";

interface NearbyUser {
  userId: string;
  latitude: number;
  longitude: number;
  distance: number;
  timestamp: Date;
  accuracy?: number;
}

export function NearbyUsersExample() {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocationStore((s) => s.location);

  const fetchNearbyUsers = async () => {
    if (!location) {
      setError("Location not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get users within 500 meters
      const users = await getNearbyUsers(location.lat, location.lon, 500);
      setNearbyUsers(users);
    } catch (err) {
      setError("Failed to fetch nearby users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Optionally auto-fetch when location changes
    if (location) {
      fetchNearbyUsers();
    }
  }, [location]);

  const renderUser = ({ item }: { item: NearbyUser }) => (
    <View style={styles.userCard}>
      <Text style={styles.userId}>User ID: {item.userId}</Text>
      <Text style={styles.distance}>Distance: {item.distance.toFixed(1)}m</Text>
      <Text style={styles.coords}>
        Location: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
      </Text>
      {item.accuracy && (
        <Text style={styles.accuracy}>Accuracy: ±{item.accuracy}m</Text>
      )}
      <Text style={styles.timestamp}>
        Last seen: {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Users (Within 500m)</Text>

      {location && (
        <View style={styles.currentLocation}>
          <Text style={styles.locationText}>Your Location:</Text>
          <Text style={styles.coords}>
            {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
          </Text>
          {location.accuracy && (
            <Text style={styles.accuracy}>Accuracy: ±{location.accuracy}m</Text>
          )}
        </View>
      )}

      <Button
        title="Refresh Nearby Users"
        onPress={fetchNearbyUsers}
        disabled={loading || !location}
      />

      {loading && <Text style={styles.status}>Loading...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && nearbyUsers.length === 0 && (
        <Text style={styles.status}>No users found nearby</Text>
      )}

      <FlatList
        data={nearbyUsers}
        keyExtractor={(item) => item.userId}
        renderItem={renderUser}
        style={styles.list}
      />

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Found {nearbyUsers.length} user(s) nearby
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  currentLocation: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  list: {
    marginTop: 16,
  },
  userCard: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userId: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  distance: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 8,
  },
  coords: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  accuracy: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  status: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  error: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#f44336",
  },
  stats: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
  },
  statsText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
  },
});

// Alternative: Simple hook to use in any component
export function useNearbyUsers(radiusInMeters: number = 500) {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocationStore((s) => s.location);

  const refresh = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const nearbyUsers = await getNearbyUsers(
        location.lat,
        location.lon,
        radiusInMeters
      );
      setUsers(nearbyUsers);
    } catch (error) {
      console.error("Error fetching nearby users:", error);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, refresh };
}

// Usage of the hook:
// const { users, loading, refresh } = useNearbyUsers(500);
