import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export interface NearbyPlace {
  place_id: string;
  name: string;
  type: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  distance?: number;
  contactNumber?: string;
  rating?: number;
  isOpen?: boolean;
  openingHours?: string[];
  website?: string;
}

export interface NearbyPlacesByCategory {
  policeStations: NearbyPlace[];
  hospitals: NearbyPlace[];
  pharmacies: NearbyPlace[];
  busStops: NearbyPlace[];
}

/**
 * Fetch nearby places grouped by category
 */
export async function getNearbyPlacesByCategory(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  limitPerCategory: number = 5
): Promise<NearbyPlacesByCategory> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(
      `${API_URL}/nearby-places/categories?latitude=${latitude}&longitude=${longitude}&radius=${radius}&limitPerCategory=${limitPerCategory}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch nearby places");
    }

    return data.data;
  } catch (error: any) {
    console.error("Error fetching nearby places by category:", error);
    throw error;
  }
}

/**
 * Fetch nearby places by type
 */
export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  type?: "police" | "hospital" | "pharmacy" | "bus_station",
  radius: number = 5000,
  limit: number = 10
): Promise<NearbyPlace[]> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    let url = `${API_URL}/nearby-places?latitude=${latitude}&longitude=${longitude}&radius=${radius}&limit=${limit}`;
    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch nearby places");
    }

    return data.data;
  } catch (error: any) {
    console.error("Error fetching nearby places:", error);
    throw error;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get display name for place type
 */
export function getPlaceTypeName(type: string): string {
  switch (type) {
    case "police":
      return "Police Station";
    case "hospital":
      return "Hospital";
    case "pharmacy":
      return "Pharmacy";
    case "bus_station":
      return "Bus Stop";
    default:
      return type;
  }
}
