import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export interface HomeNearbyUser {
  userId: string;
  name: string;
  email?: string;
  mobile?: string;
  latitude: number;
  longitude: number;
  distance: number;
  timestamp: string;
  accuracy?: number;
}

export interface HomeNearbyPlace {
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

export interface HomeNearbyLocations {
  policeStations: HomeNearbyPlace[];
  hospitals: HomeNearbyPlace[];
  pharmacies: HomeNearbyPlace[];
  busStops: HomeNearbyPlace[];
}

export interface HomePayload {
  user: Record<string, any>;
  trustedContacts: Array<Record<string, any>>;
  codeWord?: string;
  location?: {
    latitude: number | null;
    longitude: number | null;
    source: "query" | "lastKnown" | null;
  };
  nearbyUsers: HomeNearbyUser[];
  nearbyLocations: HomeNearbyLocations;
}

export interface HomeApiResponse {
  success: boolean;
  message: string;
  data: HomePayload;
  warnings?: string[];
}

interface FetchHomeDataOptions {
  latitude?: number;
  longitude?: number;
}

export async function fetchHomeData(
  options: FetchHomeDataOptions = {},
): Promise<HomeApiResponse> {
  const token = await AsyncStorage.getItem("authToken");
  if (!token) {
    throw new Error("Authentication token not found");
  }

  const params = new URLSearchParams();
  if (Number.isFinite(options.latitude)) {
    params.append("latitude", String(options.latitude));
  }
  if (Number.isFinite(options.longitude)) {
    params.append("longitude", String(options.longitude));
  }

  const query = params.toString();
  const url = `${API_URL}/home${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Failed to fetch home data");
  }

  return data;
}
