import type { Request, Response } from "express";
import GooglePlacesService from "../services/GooglePlacesService";

export class NearbyPlacesController {
  /**
   * Get nearby places by category
   * GET /api/nearby-places/categories
   */
  static async getNearbyPlacesByCategory(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius, limitPerCategory } = req.query;

      // Validate required parameters
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const rad = radius ? parseInt(radius as string) : 5000;
      const limit = limitPerCategory ? parseInt(limitPerCategory as string) : 5;

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude",
        });
      }

      const places = await GooglePlacesService.findNearbyPlacesByCategory(
        lat,
        lon,
        rad,
        limit
      );

      return res.status(200).json({
        success: true,
        message: "Nearby places fetched successfully",
        data: places,
      });
    } catch (error: any) {
      console.error("Error fetching nearby places by category:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch nearby places",
      });
    }
  }

  /**
   * Get nearby places by type
   * GET /api/nearby-places
   */
  static async getNearbyPlaces(req: Request, res: Response) {
    try {
      const { latitude, longitude, type, radius, limit } = req.query;

      // Validate required parameters
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude",
        });
      }

      // Validate type if provided
      const validTypes = ["police", "hospital", "pharmacy", "bus_station"];
      if (type && !validTypes.includes(type as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        });
      }

      const query: any = {
        latitude: lat,
        longitude: lon,
        type: type as any,
      };

      if (radius) {
        query.radius = parseInt(radius as string);
      }

      if (limit) {
        query.limit = parseInt(limit as string);
      }

      const places = await GooglePlacesService.findNearbyPlaces(query);

      return res.status(200).json({
        success: true,
        message: "Nearby places fetched successfully",
        data: places,
        count: places.length,
      });
    } catch (error: any) {
      console.error("Error fetching nearby places:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch nearby places",
      });
    }
  }
}
