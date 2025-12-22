import { Types } from "mongoose";
import { Location } from "../models/Location";
import type { ILocation } from "../models/Location";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | undefined;
  altitude?: number | undefined;
  speed?: number | undefined;
  heading?: number | undefined;
  timestamp?: Date | undefined;
}

export class LocationService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180; // Convert to radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance;
  }

  /**
   * Get the last location for a user
   */
  static async getLastLocation(
    userId: string | Types.ObjectId
  ): Promise<ILocation | null> {
    try {
      const lastLocation = await Location.findOne({ userId })
        .sort({ timestamp: -1 })
        .exec();
      return lastLocation;
    } catch (error) {
      console.error("Error fetching last location:", error);
      throw new Error("Failed to fetch last location");
    }
  }

  /**
   * Store location if it's more than 100 meters from the last location
   * Returns the stored location if saved, null if not saved due to distance threshold
   */
  static async storeLocation(
    userId: string | Types.ObjectId,
    locationData: LocationData
  ): Promise<{
    saved: boolean;
    location: ILocation | null;
    distance?: number;
  }> {
    try {
      const userObjectId =
        typeof userId === "string" ? new Types.ObjectId(userId) : userId;

      // Get the last location for this user
      const lastLocation = await this.getLastLocation(userObjectId);

      // If there's a previous location, check the distance
      if (lastLocation) {
        const distance = this.calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          locationData.latitude,
          locationData.longitude
        );

        // Only store if distance is >= 5 meters
        if (distance < 5) {
          return {
            saved: false,
            location: null,
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          };
        }
      }

      // Store the new location
      const newLocation = new Location({
        userId: userObjectId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: locationData.timestamp || new Date(),
      });

      await newLocation.save();

      const distanceValue = lastLocation
        ? Math.round(
            this.calculateDistance(
              lastLocation.latitude,
              lastLocation.longitude,
              locationData.latitude,
              locationData.longitude
            ) * 100
          ) / 100
        : undefined;

      return {
        saved: true,
        location: newLocation,
        ...(distanceValue !== undefined && { distance: distanceValue }),
      };
    } catch (error) {
      console.error("Error storing location:", error);
      throw new Error("Failed to store location");
    }
  }

  /**
   * Get all users within a specific radius (in meters) from a given location
   * Excludes the current user
   * Includes user details (name, email, mobile)
   */
  static async getNearbyUsers(
    latitude: number,
    longitude: number,
    radiusInMeters: number,
    excludeUserId?: string | Types.ObjectId
  ): Promise<
    Array<{
      userId: Types.ObjectId;
      name: string;
      email?: string;
      mobile?: string;
      latitude: number;
      longitude: number;
      distance: number;
      timestamp: Date;
      accuracy?: number;
    }>
  > {
    try {
      // Get all users' latest locations with user details
      const allLocations = await Location.aggregate([
        {
          $sort: { timestamp: -1 },
        },
        {
          $group: {
            _id: "$userId",
            latitude: { $first: "$latitude" },
            longitude: { $first: "$longitude" },
            timestamp: { $first: "$timestamp" },
            accuracy: { $first: "$accuracy" },
          },
        },
        {
          $lookup: {
            from: "users", // MongoDB collection name for User model
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            userId: "$_id",
            name: "$userDetails.name",
            email: "$userDetails.email",
            mobile: "$userDetails.mobile",
            latitude: 1,
            longitude: 1,
            timestamp: 1,
            accuracy: 1,
          },
        },
      ]);

      // Filter users within radius and exclude current user
      const nearbyUsers = allLocations
        .map((loc) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            loc.latitude,
            loc.longitude
          );

          return {
            userId: loc.userId,
            name: loc.name,
            email: loc.email,
            mobile: loc.mobile,
            latitude: loc.latitude,
            longitude: loc.longitude,
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            timestamp: loc.timestamp,
            accuracy: loc.accuracy,
          };
        })
        .filter((user) => {
          // Exclude current user if provided
          if (excludeUserId) {
            const excludeId =
              typeof excludeUserId === "string"
                ? new Types.ObjectId(excludeUserId)
                : excludeUserId;
            if (user.userId.equals(excludeId)) {
              return false;
            }
          }
          // Only include users within the radius
          return user.distance <= radiusInMeters;
        })
        .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)

      return nearbyUsers;
    } catch (error) {
      console.error("Error fetching nearby users:", error);
      throw new Error("Failed to fetch nearby users");
    }
  }

  /**
   * Get location history for a user
   */
  static async getLocationHistory(
    userId: string | Types.ObjectId,
    limit: number = 50
  ): Promise<ILocation[]> {
    try {
      const history = await Location.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
      return history;
    } catch (error) {
      console.error("Error fetching location history:", error);
      throw new Error("Failed to fetch location history");
    }
  }

  /**
   * Delete old location records (older than specified days)
   * Useful for data cleanup and privacy
   */
  static async deleteOldLocations(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Location.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error("Error deleting old locations:", error);
      throw new Error("Failed to delete old locations");
    }
  }
}
