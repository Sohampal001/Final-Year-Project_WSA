import type { Request, Response } from "express";
import { User } from "../models/User.ts";
import trustedContactService from "../services/TrustedContactService.ts";
import { LocationService } from "../services/LocationService.ts";
import GooglePlacesService from "../services/GooglePlacesService.ts";
import codeWordService from "../services/CodeWordService.ts";

export class HomeController {
  /**
   * Get all home screen data for authenticated user
   * GET /api/home
   * query: latitude?, longitude?, nearbyUsersRadius?, nearbyPlacesRadius?, limitPerCategory?
   */
  static async getHomeData(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const [user, trustedContacts, codeWord] = await Promise.all([
        User.findById(userId).select("-password").lean(),
        trustedContactService.getTrustedContacts(userId),
        codeWordService.getCodeWord(userId),
      ]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const queryLatitude = req.query.latitude
        ? parseFloat(req.query.latitude as string)
        : undefined;
      const queryLongitude = req.query.longitude
        ? parseFloat(req.query.longitude as string)
        : undefined;

      let latitude = queryLatitude;
      let longitude = queryLongitude;
      let locationSource: "query" | "lastKnown" | null = null;

      if (
        latitude !== undefined &&
        longitude !== undefined &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude)
      ) {
        locationSource = "query";
      } else {
        const lastLocation = await LocationService.getLastLocation(userId);
        if (lastLocation) {
          latitude = lastLocation.latitude;
          longitude = lastLocation.longitude;
          locationSource = "lastKnown";
        }
      }

      const nearbyUsersRadius = req.query.nearbyUsersRadius
        ? parseInt(req.query.nearbyUsersRadius as string, 10)
        : 500;
      const nearbyPlacesRadius = req.query.nearbyPlacesRadius
        ? parseInt(req.query.nearbyPlacesRadius as string, 10)
        : 5000;
      const limitPerCategory = req.query.limitPerCategory
        ? parseInt(req.query.limitPerCategory as string, 10)
        : 5;

      let nearbyUsers: Array<{
        userId: unknown;
        name: string;
        email?: string;
        mobile?: string;
        latitude: number;
        longitude: number;
        distance: number;
        timestamp: Date;
        accuracy?: number;
      }> = [];

      let nearbyLocations: {
        policeStations: unknown[];
        hospitals: unknown[];
        pharmacies: unknown[];
        busStops: unknown[];
      } = {
        policeStations: [],
        hospitals: [],
        pharmacies: [],
        busStops: [],
      };

      const warnings: string[] = [];

      if (
        latitude !== undefined &&
        longitude !== undefined &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        const [usersResult, placesResult] = await Promise.allSettled([
          LocationService.getNearbyUsers(
            latitude,
            longitude,
            nearbyUsersRadius,
            userId,
          ),
          GooglePlacesService.findNearbyPlacesByCategory(
            latitude,
            longitude,
            nearbyPlacesRadius,
            limitPerCategory,
          ),
        ]);

        if (usersResult.status === "fulfilled") {
          nearbyUsers = usersResult.value;
        } else {
          warnings.push("Failed to fetch nearby users");
        }

        if (placesResult.status === "fulfilled") {
          nearbyLocations = placesResult.value;
        } else {
          warnings.push("Failed to fetch nearby locations");
        }
      } else {
        warnings.push(
          "Location not provided or unavailable. Nearby users and locations are empty.",
        );
      }

      return res.status(200).json({
        success: true,
        message: "Home data fetched successfully",
        data: {
          user,
          trustedContacts,
          codeWord,
          location: {
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            source: locationSource,
          },
          nearbyUsers,
          nearbyLocations,
        },
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    } catch (error: any) {
      console.error("Error fetching home data:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch home data",
        error: error.message,
      });
    }
  }
}
