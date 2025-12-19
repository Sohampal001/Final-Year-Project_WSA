import { OTP, type IOTP } from "../models/OTP";
import { User } from "../models/User";
import { Types } from "mongoose";
import EmailService from "./EmailService";

export class OTPService {
  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to email
   */
  private async sendOTPToEmail(
    email: string,
    otp: string,
    purpose: string
  ): Promise<void> {
    try {
      const subject = `Your OTP for ${purpose}`;
      const message = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Suraksha - OTP Verification</h2>
          <p style="font-size: 16px; color: #555;">Your OTP for ${purpose} is:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2c3e50; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="font-size: 14px; color: #777;">This OTP is valid for 5 minutes.</p>
          <p style="font-size: 14px; color: #777;">If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply.</p>
        </div>
      `;

      await EmailService.sendEmail(email, subject, message);
      console.log(`📧 OTP sent to email: ${email}`);
    } catch (error) {
      throw new Error(
        `Failed to send OTP to email: ${(error as Error).message}`
      );
    }
  }

  /**
   * Send OTP to mobile (placeholder for future implementation)
   */
  private async sendOTPToMobile(
    mobile: string,
    otp: string,
    purpose: string
  ): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 OTP for mobile ${mobile}: ${otp} (Purpose: ${purpose})`);
    console.log(`Note: SMS integration pending. Use email for now.`);
  }

  /**
   * Create or resend OTP
   */
  async createOTP(
    userId: string | Types.ObjectId,
    type:
      | "AADHAAR"
      | "SIGNUP"
      | "EMAIL_VERIFICATION"
      | "MOBILE_VERIFICATION"
      | "PASSWORD_RESET",
    purpose: string,
    sendTo: { email?: string; mobile?: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate that at least email or mobile is provided
      if (!sendTo.email && !sendTo.mobile) {
        throw new Error("Either email or mobile must be provided");
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if unexpired OTP already exists
      const existingOTP = await OTP.findOne({
        userId,
        type,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      });

      if (existingOTP) {
        // Resend existing OTP
        if (sendTo.email) {
          await this.sendOTPToEmail(sendTo.email, existingOTP.otp, purpose);
        }
        if (sendTo.mobile) {
          await this.sendOTPToMobile(sendTo.mobile, existingOTP.otp, purpose);
        }

        return {
          success: true,
          message: `OTP resent successfully. Valid for ${Math.ceil(
            (existingOTP.expiresAt.getTime() - Date.now()) / 60000
          )} minutes.`,
        };
      }

      // Delete any old OTPs for this user and type
      await OTP.deleteMany({ userId, type });

      // Generate new OTP
      const otp = this.generateOTP();

      // Set expiry (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Create OTP record
      await OTP.create({
        userId,
        otp,
        type,
        purpose,
        email: sendTo.email!,
        mobile: sendTo.mobile!,
        isVerified: false,
        expiresAt,
      });

      // Send OTP
      if (sendTo.email) {
        await this.sendOTPToEmail(sendTo.email, otp, purpose);
      }
      if (sendTo.mobile) {
        await this.sendOTPToMobile(sendTo.mobile, otp, purpose);
      }

      return {
        success: true,
        message: "OTP sent successfully. Valid for 5 minutes.",
      };
    } catch (error) {
      throw new Error(`Error creating OTP: ${(error as Error).message}`);
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    userId: string | Types.ObjectId,
    type:
      | "AADHAAR"
      | "SIGNUP"
      | "EMAIL_VERIFICATION"
      | "MOBILE_VERIFICATION"
      | "PASSWORD_RESET",
    otp: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find OTP
      const otpRecord = await OTP.findOne({
        userId,
        type,
        isVerified: false,
      });

      if (!otpRecord) {
        throw new Error("No OTP found. Please request a new OTP.");
      }

      // Check if expired
      if (new Date() > otpRecord.expiresAt) {
        await OTP.deleteOne({ _id: otpRecord._id });
        throw new Error("OTP expired. Please request a new OTP.");
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        throw new Error("Invalid OTP. Please try again.");
      }

      // Delete OTP after successful verification
      await OTP.deleteOne({ _id: otpRecord._id });

      return {
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error) {
      throw new Error(`Error verifying OTP: ${(error as Error).message}`);
    }
  }

  /**
   * Get OTP details (for checking if OTP exists)
   */
  async getOTP(
    userId: string | Types.ObjectId,
    type:
      | "AADHAAR"
      | "SIGNUP"
      | "EMAIL_VERIFICATION"
      | "MOBILE_VERIFICATION"
      | "PASSWORD_RESET"
  ): Promise<IOTP | null> {
    try {
      const otp = await OTP.findOne({
        userId,
        type,
        isVerified: false,
        expiresAt: { $gt: new Date() },
      });

      return otp;
    } catch (error) {
      throw new Error(`Error getting OTP: ${(error as Error).message}`);
    }
  }

  /**
   * Delete OTP
   */
  async deleteOTP(
    userId: string | Types.ObjectId,
    type:
      | "AADHAAR"
      | "SIGNUP"
      | "EMAIL_VERIFICATION"
      | "MOBILE_VERIFICATION"
      | "PASSWORD_RESET"
  ): Promise<boolean> {
    try {
      const result = await OTP.deleteMany({ userId, type });
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Error deleting OTP: ${(error as Error).message}`);
    }
  }

  /**
   * Delete all expired OTPs (cleanup function)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      return result.deletedCount;
    } catch (error) {
      throw new Error(`Error cleaning up OTPs: ${(error as Error).message}`);
    }
  }
}

export default new OTPService();
