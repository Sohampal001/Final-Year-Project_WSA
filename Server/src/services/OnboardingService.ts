import { Guardian, type IGuardian } from "../models/Guardian";
import { Address, type IAddress } from "../models/Address";
import { Aadhaar, type IAadhaar } from "../models/Aadhar";
import { User } from "../models/User";
import { Types } from "mongoose";
import crypto from "crypto";
import userService from "./UserService";
import otpService from "./OTPService";

// Temporary storage for Aadhaar number during verification
interface AadhaarVerificationData {
  aadhaarNumber: string;
}

const aadhaarVerificationStore = new Map<string, AadhaarVerificationData>();

export class OnboardingService {
  /**
   * Add guardian to user profile
   */
  async addGuardian(
    userId: string | Types.ObjectId,
    guardianData: {
      name: string;
      relationship: string;
      mobile: string;
      email?: string;
      aadhaarLast4?: string;
      priority?: number;
    }
  ): Promise<IGuardian> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if guardian with same mobile already exists for this user
      const existingGuardian = await Guardian.findOne({
        userId,
        mobile: guardianData.mobile,
      });

      if (existingGuardian) {
        throw new Error("Guardian with this mobile number already exists");
      }

      // Get current guardian count to set priority
      const guardianCount = await Guardian.countDocuments({ userId });

      // Create guardian
      const guardian = await Guardian.create({
        userId,
        name: guardianData.name,
        relationship: guardianData.relationship,
        mobile: guardianData.mobile,
        ...(guardianData.email && { email: guardianData.email }),
        ...(guardianData.aadhaarLast4 && {
          aadhaarLast4: guardianData.aadhaarLast4,
        }),
        priority: guardianData.priority || guardianCount + 1,
        isVerified: false,
      });

      return guardian;
    } catch (error) {
      throw new Error(`Error adding guardian: ${(error as Error).message}`);
    }
  }

  /**
   * Get all guardians for a user
   */
  async getGuardians(userId: string | Types.ObjectId): Promise<IGuardian[]> {
    try {
      const guardians = await Guardian.find({ userId }).sort({ priority: 1 });
      return guardians;
    } catch (error) {
      throw new Error(`Error getting guardians: ${(error as Error).message}`);
    }
  }

  /**
   * Update guardian
   */
  async updateGuardian(
    guardianId: string | Types.ObjectId,
    updateData: Partial<IGuardian>
  ): Promise<IGuardian | null> {
    try {
      const guardian = await Guardian.findByIdAndUpdate(
        guardianId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      return guardian;
    } catch (error) {
      throw new Error(`Error updating guardian: ${(error as Error).message}`);
    }
  }

  /**
   * Delete guardian
   */
  async deleteGuardian(guardianId: string | Types.ObjectId): Promise<boolean> {
    try {
      const result = await Guardian.findByIdAndDelete(guardianId);
      return !!result;
    } catch (error) {
      throw new Error(`Error deleting guardian: ${(error as Error).message}`);
    }
  }

  /**
   * Add address to user profile
   */
  async addAddress(
    userId: string | Types.ObjectId,
    addressData: {
      type: "HOME" | "WORK" | "OTHER";
      fullAddress: string;
      latitude: number;
      longitude: number;
    }
  ): Promise<IAddress> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if address of same type already exists
      const existingAddress = await Address.findOne({
        userId,
        type: addressData.type,
      });

      if (existingAddress) {
        throw new Error(
          `${addressData.type} address already exists. Please update instead.`
        );
      }

      // Create address
      const address = await Address.create({
        userId,
        type: addressData.type,
        fullAddress: addressData.fullAddress,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
      });

      return address;
    } catch (error) {
      throw new Error(`Error adding address: ${(error as Error).message}`);
    }
  }

  /**
   * Get all addresses for a user
   */
  async getAddresses(userId: string | Types.ObjectId): Promise<IAddress[]> {
    try {
      const addresses = await Address.find({ userId });
      return addresses;
    } catch (error) {
      throw new Error(`Error getting addresses: ${(error as Error).message}`);
    }
  }

  /**
   * Update address
   */
  async updateAddress(
    addressId: string | Types.ObjectId,
    updateData: Partial<IAddress>
  ): Promise<IAddress | null> {
    try {
      const address = await Address.findByIdAndUpdate(addressId, updateData, {
        new: true,
        runValidators: true,
      });
      return address;
    } catch (error) {
      throw new Error(`Error updating address: ${(error as Error).message}`);
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: string | Types.ObjectId): Promise<boolean> {
    try {
      const result = await Address.findByIdAndDelete(addressId);
      return !!result;
    } catch (error) {
      throw new Error(`Error deleting address: ${(error as Error).message}`);
    }
  }

  /**
   * Generate and send OTP for Aadhaar verification
   * For now, sends OTP to user's registered email
   * TODO: Later integrate with external Aadhaar API service
   */
  async sendAadhaarOTP(
    userId: string | Types.ObjectId,
    aadhaarNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user has email
      if (!user.email) {
        throw new Error(
          "User email not found. Please add email to your profile."
        );
      }

      // Check if Aadhaar already verified for this user
      const existingAadhaar = await Aadhaar.findOne({ userId });
      if (existingAadhaar) {
        throw new Error("Aadhaar already verified for this user");
      }

      // Validate Aadhaar number (should be 12 digits)
      if (!/^\d{12}$/.test(aadhaarNumber)) {
        throw new Error("Invalid Aadhaar number. Must be 12 digits.");
      }

      // Store Aadhaar number temporarily for verification
      aadhaarVerificationStore.set(userId.toString(), { aadhaarNumber });

      // Send OTP using OTP service
      const result = await otpService.createOTP(
        userId,
        "AADHAAR",
        "Aadhaar Verification",
        { email: user.email }
      );

      return result;
    } catch (error) {
      throw new Error(`Error sending Aadhaar OTP: ${(error as Error).message}`);
    }
  }

  /**
   * Verify Aadhaar with OTP
   */
  async verifyAadhaarOTP(
    userId: string | Types.ObjectId,
    otp: string
  ): Promise<IAadhaar> {
    try {
      const userIdStr = userId.toString();

      // Get Aadhaar number from temporary store
      const aadhaarData = aadhaarVerificationStore.get(userIdStr);
      if (!aadhaarData) {
        throw new Error(
          "No Aadhaar verification request found. Please request OTP first."
        );
      }

      // Verify OTP using OTP service
      await otpService.verifyOTP(userId, "AADHAAR", otp);

      // Hash Aadhaar number for storage
      const aadhaarHash = crypto
        .createHash("sha256")
        .update(aadhaarData.aadhaarNumber)
        .digest("hex");

      // Get last 4 digits
      const aadhaarLast4 = aadhaarData.aadhaarNumber.slice(-4);

      // Create Aadhaar record
      const aadhaar = await Aadhaar.create({
        userId: userIdStr,
        aadhaarHash,
        aadhaarLast4,
        verifiedAt: new Date(),
        verificationProvider: "Email-OTP",
      });

      // Clear Aadhaar data from temporary store
      aadhaarVerificationStore.delete(userIdStr);

      // Update user's guardian verification status if applicable
      await userService.updateGuardianVerificationStatus(userIdStr, true);

      return aadhaar;
    } catch (error) {
      throw new Error(`Error verifying Aadhaar: ${(error as Error).message}`);
    }
  }

  /**
   * Get Aadhaar details for a user
   */
  async getAadhaar(userId: string | Types.ObjectId): Promise<IAadhaar | null> {
    try {
      const aadhaar = await Aadhaar.findOne({ userId });
      return aadhaar;
    } catch (error) {
      throw new Error(`Error getting Aadhaar: ${(error as Error).message}`);
    }
  }

  /**
   * Check onboarding completion status
   */
  async getOnboardingStatus(userId: string | Types.ObjectId): Promise<{
    isComplete: boolean;
    hasGuardian: boolean;
    hasAddress: boolean;
    hasAadhaar: boolean;
    guardianCount: number;
    addressCount: number;
  }> {
    try {
      const [guardianCount, addressCount, aadhaar] = await Promise.all([
        Guardian.countDocuments({ userId }),
        Address.countDocuments({ userId }),
        Aadhaar.findOne({ userId }),
      ]);

      const hasGuardian = guardianCount > 0;
      const hasAddress = addressCount > 0;
      const hasAadhaar = !!aadhaar;

      return {
        isComplete: hasGuardian && hasAddress && hasAadhaar,
        hasGuardian,
        hasAddress,
        hasAadhaar,
        guardianCount,
        addressCount,
      };
    } catch (error) {
      throw new Error(
        `Error checking onboarding status: ${(error as Error).message}`
      );
    }
  }
}

export default new OnboardingService();
