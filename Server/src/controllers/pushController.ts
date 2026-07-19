import type { Request, Response } from "express";
import { User } from "../models/User.ts";

export class PushController {
  /**
   * Save the current user's Expo push token
   * POST /api/push/token
   */
  static async savePushToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const { expoPushToken } = req.body;

      if (typeof expoPushToken !== "string" || expoPushToken.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "expoPushToken is required and must be a non-empty string",
        });
      }

      await User.findByIdAndUpdate(userId, {
        $addToSet: { expoPushTokens: expoPushToken },
      });

      return res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      console.error("Error in savePushToken:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save push token",
        error: error.message,
      });
    }
  }

  /**
   * Remove an Expo push token from the current user (e.g. on logout so the
   * device stops receiving that user's alerts).
   * POST /api/push/token/remove
   */
  static async removePushToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const { expoPushToken } = req.body;

      if (typeof expoPushToken !== "string" || expoPushToken.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "expoPushToken is required and must be a non-empty string",
        });
      }

      await User.findByIdAndUpdate(userId, {
        $pull: { expoPushTokens: expoPushToken },
      });

      return res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      console.error("Error in removePushToken:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove push token",
        error: error.message,
      });
    }
  }
}
