import AsyncStorage from "@react-native-async-storage/async-storage";

// Ensure API_URL is defined
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: Date;
}

interface NearbyUser {
  userId: string;
  name: string;
  email?: string;
  mobile?: string;
  latitude: number;
  longitude: number;
  distance: number;
  timestamp: Date;
  accuracy?: number;
}

export type { LocationData, NearbyUser };

/**
 * Update user's location on the server
 */
export async function updateLocationOnServer(
  locationData: LocationData
): Promise<{
  success: boolean;
  saved: boolean;
  distance?: number;
}> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      console.error("No authentication token found");
      return { success: false, saved: false };
    }

    const response = await fetch(`${API_URL}/location/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(locationData),
    });

    if (!response.ok) {
      console.error("Failed to update location:", response.status);
      return { success: false, saved: false };
    }

    const text = await response.text();
    if (!text) {
      console.error("Empty response from server");
      return { success: false, saved: false };
    }

    const data = JSON.parse(text);

    return {
      success: data.success,
      saved: data.data?.location ? true : false,
      distance: data.data?.distanceFromPrevious,
    };
  } catch (error) {
    console.error("Error updating location on server:", error);
    return { success: false, saved: false };
  }
}

/**
 * Get nearby users within a specified radius (default 500m)
 */
export async function getNearbyUsers(
  latitude: number,
  longitude: number,
  radius: number = 500
): Promise<NearbyUser[]> {
  try {
    console.log("🌐 API Call: getNearbyUsers", { latitude, longitude, radius });

    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      console.error("❌ No authentication token found");
      return [];
    }

    const url = `${API_URL}/location/nearby`;
    console.log("📡 Calling:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, radius }),
    });

    console.log("📊 Response status:", response.status);

    if (!response.ok) {
      console.error("❌ Failed to get nearby users:", response.status);
      return [];
    }

    const text = await response.text();
    if (!text) {
      console.error("⚠️ Empty response from server");
      return [];
    }

    const data = JSON.parse(text);
    console.log("📦 Response data:", data);

    const users = data.data?.users || [];
    console.log("👥 Found users:", users.length);

    return users;
  } catch (error) {
    console.error("❌ Error getting nearby users:", error);
    return [];
  }
}

/**
 * Get current user's last location from server
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      console.error("No authentication token found");
      return null;
    }

    const response = await fetch(`${API_URL}/location/current`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to get current location:", data.message);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

/**
 * Get location history for current user
 */
export async function getLocationHistory(
  limit: number = 50
): Promise<LocationData[]> {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found");
      return [];
    }

    const response = await fetch(`${API_URL}/location/history?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to get location history:", data.message);
      return [];
    }

    return data.data?.locations || [];
  } catch (error) {
    console.error("Error getting location history:", error);
    return [];
  }
}
