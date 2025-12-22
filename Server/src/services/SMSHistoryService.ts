import { SMSHistory, type ISMSHistory } from "../models/SMSHistory";
import mongoose from "mongoose";

interface SaveSMSHistoryParams {
  userId: string | mongoose.Types.ObjectId;
  recipients: string[];
  message: string;
  location: {
    latitude: number;
    longitude: number;
    googleMapsLink: string;
  };
  status: "sent" | "failed";
  requestId?: string;
  userDetails: {
    name: string;
    mobile: string;
    email?: string;
  };
  guardianEmail?: string;
  emailSent: boolean;
  error?: string;
}

export class SMSHistoryService {
  /**
   * Save SMS history to database
   */
  static async saveSMSHistory(
    params: SaveSMSHistoryParams
  ): Promise<ISMSHistory> {
    try {
      const smsHistory = new SMSHistory({
        userId: params.userId,
        recipients: params.recipients,
        message: params.message,
        location: params.location,
        status: params.status,
        requestId: params.requestId,
        userDetails: params.userDetails,
        guardianEmail: params.guardianEmail,
        emailSent: params.emailSent,
        error: params.error,
        sentAt: new Date(),
      });

      await smsHistory.save();
      console.log("✅ SMS history saved successfully");
      return smsHistory;
    } catch (error) {
      console.error("❌ Error saving SMS history:", error);
      throw error;
    }
  }

  /**
   * Get SMS history for a user
   */
  static async getSMSHistory(
    userId: string,
    limit: number = 50
  ): Promise<ISMSHistory[]> {
    try {
      const history = await SMSHistory.find({ userId })
        .sort({ sentAt: -1 })
        .limit(limit);
      return history;
    } catch (error) {
      console.error("❌ Error fetching SMS history:", error);
      throw error;
    }
  }

  /**
   * Get recent SMS count for a user
   */
  static async getRecentSMSCount(
    userId: string,
    hours: number = 24
  ): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const count = await SMSHistory.countDocuments({
        userId,
        sentAt: { $gte: since },
      });
      return count;
    } catch (error) {
      console.error("❌ Error counting recent SMS:", error);
      throw error;
    }
  }

  /**
   * Check if user has sent SMS recently (for rate limiting)
   */
  static async canSendSMS(
    userId: string,
    maxPerHour: number = 10
  ): Promise<boolean> {
    try {
      const count = await this.getRecentSMSCount(userId, 1);
      return count < maxPerHour;
    } catch (error) {
      console.error("❌ Error checking SMS rate limit:", error);
      return true; // Allow in case of error
    }
  }
}

export default SMSHistoryService;
