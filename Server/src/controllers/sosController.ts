import type { Request, Response } from "express";
import { Expo } from "expo-server-sdk";
import { User } from "../models/User.ts";
import { SosBroadcast } from "../models/SosBroadcast.ts";
import type { ISosRecipient } from "../models/SosBroadcast.ts";
import { LocationService } from "../services/LocationService.ts";
import PushService from "../services/PushService.ts";
import type { PushMessageInput } from "../services/PushService.ts";

const SOS_RADIUS_METERS = 500;

export class SosController {
  /**
   * Broadcast an SOS alert to nearby users via push notification.
   * POST /api/sos/broadcast
   *
   * This endpoint is called during an emergency and must never throw
   * an uncaught error.
   */
  static async broadcast(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User not authenticated.",
        });
      }

      const { latitude, longitude, triggerType } = req.body;

      // Validate coordinates
      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return res.status(400).json({
          success: false,
          message: "latitude and longitude must be finite numbers",
        });
      }

      // Load victim info
      const victim = await User.findById(userId).select("name mobile");

      // Find nearby users (fixed 500m radius, excluding the victim)
      const nearby = await LocationService.getNearbyUsers(
        latitude,
        longitude,
        SOS_RADIUS_METERS,
        userId,
      );

      // Fetch stored push tokens for the nearby users. A user may be logged
      // in on multiple devices, so each carries an array of tokens.
      const nearbyIds = nearby.map((user) => user.userId);
      const usersWithTokens = await User.find({
        _id: { $in: nearbyIds },
        expoPushTokens: { $exists: true, $ne: [] },
      }).select("_id expoPushTokens");

      const tokenMap = new Map<string, string[]>();
      for (const user of usersWithTokens) {
        if (user.expoPushTokens && user.expoPushTokens.length > 0) {
          tokenMap.set(user._id.toString(), user.expoPushTokens);
        }
      }

      // Build a FLAT list of push targets: one recipient row per device.
      // A user with 3 registered devices produces 3 recipients. Filtering by
      // isExpoPushToken here keeps the recipients array aligned 1:1 with the
      // messages sent (and therefore with the returned tickets).
      const recipients: ISosRecipient[] = [];
      for (const user of nearby) {
        const tokens = tokenMap.get(user.userId.toString());
        if (!tokens) {
          continue;
        }
        for (const token of tokens) {
          if (!Expo.isExpoPushToken(token)) {
            continue;
          }
          const recipient: ISosRecipient = {
            userId: user.userId,
            name: user.name,
            distance: user.distance,
            expoPushToken: token,
          };
          if (user.mobile) {
            recipient.mobile = user.mobile;
          }
          recipients.push(recipient);
        }
      }

      const victimName = victim?.name || "A user";

      // Create the broadcast document first so we have its _id for the deep link
      const doc = await SosBroadcast.create({
        victimUserId: userId,
        triggerType: triggerType === "VOICE" ? "VOICE" : "BUTTON",
        location: { latitude, longitude },
        radius: SOS_RADIUS_METERS,
        recipients,
        notifiedCount: 0,
        ...(victim?.name ? { victimName: victim.name } : {}),
        ...(victim?.mobile ? { victimMobile: victim.mobile } : {}),
      });

      const broadcastId = doc._id.toString();

      // Build push messages (same order as recipients)
      const messages: PushMessageInput[] = recipients.map((recipient) => ({
        to: recipient.expoPushToken as string,
        title: "🚨 Someone needs help nearby",
        body: `${victimName} needs help — ${Math.round(
          recipient.distance || 0,
        )}m away. Tap to help.`,
        data: { type: "sos_alert", broadcastId },
        channelId: "sos-alerts",
      }));

      const tickets = await PushService.sendPush(messages);

      // Map tickets back to recipients by index (order is preserved).
      // Collect dead (unregistered) tokens for cleanup, grouped by user.
      let notifiedCount = 0;
      const deadTokensByUser = new Map<string, Set<string>>();
      doc.recipients.forEach((recipient, index) => {
        const ticket = tickets[index];
        recipient.sentAt = new Date();
        if (ticket && ticket.status === "ok") {
          recipient.status = "SENT";
          recipient.ticketId = ticket.id;
          notifiedCount++;
        } else {
          recipient.status = "FAILED";
          if (ticket && ticket.status === "error") {
            recipient.error = ticket.message;
            // Expo signals a permanently invalid token this way.
            if (
              ticket.details?.error === "DeviceNotRegistered" &&
              recipient.expoPushToken
            ) {
              const key = recipient.userId.toString();
              const set = deadTokensByUser.get(key) ?? new Set<string>();
              set.add(recipient.expoPushToken);
              deadTokensByUser.set(key, set);
            }
          }
        }
      });

      doc.notifiedCount = notifiedCount;
      await doc.save();

      // Prune dead tokens so future broadcasts skip them. One update per
      // user. Never let cleanup failures break the emergency response.
      if (deadTokensByUser.size > 0) {
        try {
          await Promise.all(
            Array.from(deadTokensByUser.entries()).map(([uid, tokens]) =>
              User.findByIdAndUpdate(uid, {
                $pull: { expoPushTokens: { $in: Array.from(tokens) } },
              }),
            ),
          );
        } catch (cleanupError) {
          console.error("Error pruning dead push tokens:", cleanupError);
        }
      }

      return res.status(200).json({
        success: true,
        broadcastId: doc._id,
        notifiedCount,
        totalNearby: nearby.length,
      });
    } catch (error: any) {
      console.error("Error in SOS broadcast:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to broadcast SOS",
        error: error.message,
      });
    }
  }

  /**
   * Get a public-safe summary of an SOS broadcast (used by the deep link).
   * GET /api/sos/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const doc = await SosBroadcast.findById(req.params.id).select(
        "victimName victimMobile location triggerType createdAt",
      );

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: "SOS broadcast not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: doc._id,
          victimName: doc.victimName,
          victimMobile: doc.victimMobile,
          latitude: doc.location.latitude,
          longitude: doc.location.longitude,
          triggerType: doc.triggerType,
          createdAt: (doc as any).createdAt,
        },
      });
    } catch (error: any) {
      console.error("Error in SOS getById:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch SOS broadcast",
        error: error.message,
      });
    }
  }
}
