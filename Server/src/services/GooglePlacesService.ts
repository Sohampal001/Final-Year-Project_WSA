import axios from "axios";

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const GOOGLE_PLACES_BASE_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const GOOGLE_PLACE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

export interface NearbyPlaceQuery {
  latitude: number;
  longitude: number;
  type?: "police" | "hospital" | "pharmacy" | "bus_station";
  radius?: number; // in meters, default 5000
  limit?: number;
}

export interface PlaceResult {
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
  photos?: string[];
}

class GooglePlacesService {
  /**
   * Map our types to Google Places types
   */
  private getGooglePlaceType(type: string): string {
    const typeMapping: { [key: string]: string } = {
      police: "police",
      hospital: "hospital",
      pharmacy: "pharmacy",
      bus_station: "bus_station",
    };
    return typeMapping[type] || type;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get place details including contact number
   */
  private async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const response = await axios.get(GOOGLE_PLACE_DETAILS_URL, {
        params: {
          place_id: placeId,
          fields:
            "name,formatted_phone_number,international_phone_number,opening_hours,website,formatted_address",
          key: GOOGLE_PLACES_API_KEY,
        },
      });

      if (response.data.status === "OK") {
        return response.data.result;
      }
      return null;
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  }

  /**
   * Search for nearby places using Google Places API
   */
  async findNearbyPlaces(query: NearbyPlaceQuery): Promise<PlaceResult[]> {
    const { latitude, longitude, type, radius = 5000, limit } = query;

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error("Google Places API key is not configured");
    }

    // Validate coordinates
    if (
      !latitude ||
      !longitude ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Invalid coordinates");
    }

    try {
      const params: any = {
        location: `${latitude},${longitude}`,
        radius: radius,
        key: GOOGLE_PLACES_API_KEY,
      };

      // Add type if specified
      if (type) {
        params.type = this.getGooglePlaceType(type);
      }

      const response = await axios.get(GOOGLE_PLACES_BASE_URL, { params });

      if (
        response.data.status !== "OK" &&
        response.data.status !== "ZERO_RESULTS"
      ) {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      let places = response.data.results || [];

      // Limit results if specified
      if (limit) {
        places = places.slice(0, limit);
      }

      // Format results and fetch additional details
      const formattedPlaces: PlaceResult[] = await Promise.all(
        places.map(async (place: any) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          // Fetch detailed information
          const details = await this.getPlaceDetails(place.place_id);

          return {
            place_id: place.place_id,
            name: place.name,
            type: type || "place",
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            address: place.vicinity || details?.formatted_address || "",
            distance: Math.round(distance),
            contactNumber:
              details?.formatted_phone_number ||
              details?.international_phone_number ||
              undefined,
            rating: place.rating,
            isOpen: place.opening_hours?.open_now,
            openingHours: details?.opening_hours?.weekday_text,
            website: details?.website,
          };
        })
      );

      // Sort by distance
      formattedPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return formattedPlaces;
    } catch (error: any) {
      console.error("Error fetching nearby places:", error);
      throw new Error(
        `Failed to fetch nearby places: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Get nearby places grouped by category
   */
  async findNearbyPlacesByCategory(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    limitPerCategory: number = 5
  ): Promise<{
    policeStations: PlaceResult[];
    hospitals: PlaceResult[];
    pharmacies: PlaceResult[];
    busStops: PlaceResult[];
  }> {
    try {
      const [policeStations, hospitals, pharmacies, busStops] =
        await Promise.all([
          this.findNearbyPlaces({
            latitude,
            longitude,
            type: "police",
            radius,
            limit: limitPerCategory,
          }),
          this.findNearbyPlaces({
            latitude,
            longitude,
            type: "hospital",
            radius,
            limit: limitPerCategory,
          }),
          this.findNearbyPlaces({
            latitude,
            longitude,
            type: "pharmacy",
            radius,
            limit: limitPerCategory,
          }),
          this.findNearbyPlaces({
            latitude,
            longitude,
            type: "bus_station",
            radius,
            limit: limitPerCategory,
          }),
        ]);

      return {
        policeStations,
        hospitals,
        pharmacies,
        busStops,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch nearby places by category: ${error.message}`
      );
    }
  }
}

export default new GooglePlacesService();
