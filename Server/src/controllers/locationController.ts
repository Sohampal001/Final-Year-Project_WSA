import type { Request, Response } from "express";
import { LocationService } from "../services/LocationService";
import { Types } from "mongoose";

export class LocationController {
  /**
   * Update user location
   * POST /api/location/update
   */
  static async updateLocation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        timestamp,
      } = req.body;
      console.log(latitude, longitude);

      // Validate required fields
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      // Validate latitude range
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be between -90 and 90",
        });
      }

      // Validate longitude range
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be between -180 and 180",
        });
      }

      // Store location (will only save if distance >= 100m from last location)
      const locationData: {
        latitude: number;
        longitude: number;
        accuracy?: number | undefined;
        altitude?: number | undefined;
        speed?: number | undefined;
        heading?: number | undefined;
        timestamp?: Date | undefined;
      } = {
        latitude,
        longitude,
      };

      if (accuracy !== undefined) locationData.accuracy = accuracy;
      if (altitude !== undefined) locationData.altitude = altitude;
      if (speed !== undefined) locationData.speed = speed;
      if (heading !== undefined) locationData.heading = heading;
      if (timestamp) locationData.timestamp = new Date(timestamp);

      const result = await LocationService.storeLocation(userId, locationData);

      if (result.saved) {
        return res.status(201).json({
          success: true,
          message: "Location updated successfully",
          data: {
            location: result.location,
            distanceFromPrevious: result.distance,
          },
        });
      } else {
        return res.status(200).json({
          success: true,
          message:
            "Location not stored. Distance from previous location is less than 5 meters",
          data: {
            distanceFromPrevious: result.distance,
            threshold: 5,
          },
        });
      }
    } catch (error: any) {
      console.error("Error in updateLocation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update location",
        error: error.message,
      });
    }
  }

  /**
   * Get nearby users within 500 meters
   * POST /api/location/nearby
   */
  static async getNearbyUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const { latitude, longitude, radius } = req.body;

      // Validate required fields
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      // Validate latitude range
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          message: "Latitude must be between -90 and 90",
        });
      }

      // Validate longitude range
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: "Longitude must be between -180 and 180",
        });
      }

      // Default radius is 500 meters
      const searchRadius = radius || 500;

      // Get nearby users (excluding current user)
      const nearbyUsers = await LocationService.getNearbyUsers(
        latitude,
        longitude,
        searchRadius,
        userId
      );

      console.log("📍 Nearby Users Request:");
      console.log(`   User ID: ${userId}`);
      console.log(`   Location: ${latitude}, ${longitude}`);
      console.log(`   Radius: ${searchRadius}m`);
      console.log(`   Found ${nearbyUsers.length} nearby users:`);
      nearbyUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} - ${user.distance}m away`);
      });

      return res.status(200).json({
        success: true,
        message: `Found ${nearbyUsers.length} users within ${searchRadius} meters`,
        data: {
          count: nearbyUsers.length,
          radius: searchRadius,
          users: nearbyUsers,
        },
      });
    } catch (error: any) {
      console.error("Error in getNearbyUsers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch nearby users",
        error: error.message,
      });
    }
  }

  /**
   * Get current user's last location
   * GET /api/location/current
   */
  static async getCurrentLocation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const lastLocation = await LocationService.getLastLocation(userId);

      if (!lastLocation) {
        return res.status(404).json({
          success: false,
          message: "No location found for this user",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Last location retrieved successfully",
        data: lastLocation,
      });
    } catch (error: any) {
      console.error("Error in getCurrentLocation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch current location",
        error: error.message,
      });
    }
  }

  /**
   * Get location history for current user
   * GET /api/location/history?limit=50
   */
  static async getLocationHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;

      const history = await LocationService.getLocationHistory(userId, limit);

      return res.status(200).json({
        success: true,
        message: "Location history retrieved successfully",
        data: {
          count: history.length,
          locations: history,
        },
      });
    } catch (error: any) {
      console.error("Error in getLocationHistory:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch location history",
        error: error.message,
      });
    }
  }
}
