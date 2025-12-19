import { TrustedContact } from "../models/TrustedContact";
import { Guardian } from "../models/Guardian";
import { User } from "../models/User";
import { Types } from "mongoose";

/**
 * Normalize phone number by removing country code and special characters
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, "");

  // Remove country code if present (assuming +91 or 91)
  if (normalized.startsWith("91") && normalized.length > 10) {
    normalized = normalized.substring(2);
  }

  // Return last 10 digits
  return normalized.slice(-10);
}

export class TrustedContactService {
  /**
   * Add a trusted contact
   */
  async addTrustedContact(
    userId: string | Types.ObjectId,
    name: string,
    mobile: string,
    relationship: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Normalize the incoming mobile number
      const normalizedMobile = normalizePhoneNumber(mobile);
      const normalizedUserMobile = user.mobile
        ? normalizePhoneNumber(user.mobile)
        : null;

      // Check if user is trying to add their own number
      if (normalizedUserMobile && normalizedMobile === normalizedUserMobile) {
        return {
          success: false,
          message: "You cannot add your own number as a trusted contact",
        };
      }

      // Check if contact already exists (compare normalized numbers)
      const allContacts = await TrustedContact.find({
        userId,
        isActive: true,
      });

      const existingContact = allContacts.find(
        (contact) => normalizePhoneNumber(contact.mobile) === normalizedMobile
      );

      if (existingContact) {
        return {
          success: false,
          message: "This contact is already in your trusted contacts",
        };
      }

      // Check if this mobile number is the guardian's number (compare normalized)
      const allGuardians = await Guardian.find({ userId });
      const guardian = allGuardians.find(
        (g) => normalizePhoneNumber(g.mobile) === normalizedMobile
      );
      const isGuardian = !!guardian;

      // Create trusted contact
      const trustedContact = await TrustedContact.create({
        userId,
        name,
        mobile,
        relationship,
        isGuardian,
        isActive: true,
      });

      // Update user's setTrustedContacts flag if this is their first trusted contact
      const totalTrustedContacts = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });

      if (totalTrustedContacts === 1) {
        await User.findByIdAndUpdate(userId, { setTrustedContacts: true });
      }

      return {
        success: true,
        message: isGuardian
          ? "Guardian added as trusted contact successfully"
          : "Trusted contact added successfully",
        data: trustedContact,
      };
    } catch (error) {
      throw new Error(
        `Error adding trusted contact: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get all trusted contacts for a user
   */
  async getTrustedContacts(userId: string | Types.ObjectId): Promise<any[]> {
    try {
      const trustedContacts = await TrustedContact.find({
        userId,
        isActive: true,
      }).sort({ createdAt: -1 });

      return trustedContacts;
    } catch (error) {
      throw new Error(
        `Error getting trusted contacts: ${(error as Error).message}`
      );
    }
  }

  /**
   * Deactivate a trusted contact (soft delete - sets isActive to false)
   */
  async deactivateTrustedContact(
    userId: string | Types.ObjectId,
    contactId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Count total active trusted contacts
      const totalContacts = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });

      // Prevent deactivation if this is the last trusted contact
      if (totalContacts <= 1) {
        return {
          success: false,
          message:
            "Cannot deactivate the last trusted contact. You must have at least one trusted contact.",
        };
      }

      // Find and deactivate the contact
      const contact = await TrustedContact.findOne({
        _id: contactId,
        userId,
        isActive: true,
      });

      if (!contact) {
        return {
          success: false,
          message: "Trusted contact not found",
        };
      }

      // Soft delete by setting isActive to false
      contact.isActive = false;
      await contact.save();

      // Check remaining contacts and update user flag if needed
      const remainingContacts = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });

      if (remainingContacts === 0) {
        await User.findByIdAndUpdate(userId, { setTrustedContacts: false });
      }

      return {
        success: true,
        message: "Trusted contact deactivated successfully",
      };
    } catch (error) {
      throw new Error(
        `Error deactivating trusted contact: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete a trusted contact permanently (hard delete - removes from database)
   */
  async deleteTrustedContact(
    userId: string | Types.ObjectId,
    contactId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Count total active trusted contacts
      const totalContacts = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });

      // Prevent deletion if this is the last trusted contact
      if (totalContacts <= 1) {
        return {
          success: false,
          message:
            "Cannot delete the last trusted contact. You must have at least one trusted contact.",
        };
      }

      // Find and permanently delete the contact
      const contact = await TrustedContact.findOneAndDelete({
        _id: contactId,
        userId,
        isActive: true,
      });

      if (!contact) {
        return {
          success: false,
          message: "Trusted contact not found or already deleted",
        };
      }

      // Check remaining contacts and update user flag if needed
      const remainingContacts = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });

      if (remainingContacts === 0) {
        await User.findByIdAndUpdate(userId, { setTrustedContacts: false });
      }

      return {
        success: true,
        message: "Trusted contact deleted permanently",
      };
    } catch (error) {
      throw new Error(
        `Error deleting trusted contact: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update a trusted contact
   */
  async updateTrustedContact(
    userId: string | Types.ObjectId,
    contactId: string,
    updates: { name?: string; relationship?: string }
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const contact = await TrustedContact.findOne({
        _id: contactId,
        userId,
        isActive: true,
      });

      if (!contact) {
        return {
          success: false,
          message: "Trusted contact not found",
        };
      }

      // Update fields
      if (updates.name) contact.name = updates.name;
      if (updates.relationship) contact.relationship = updates.relationship;

      await contact.save();

      return {
        success: true,
        message: "Trusted contact updated successfully",
        data: contact,
      };
    } catch (error) {
      throw new Error(
        `Error updating trusted contact: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get all trusted contacts including inactive ones
   */
  async getAllTrustedContacts(
    userId: string | Types.ObjectId,
    includeInactive: boolean = false
  ): Promise<any[]> {
    try {
      const filter: any = { userId };
      if (!includeInactive) {
        filter.isActive = true;
      }

      const trustedContacts = await TrustedContact.find(filter).sort({
        createdAt: -1,
      });

      return trustedContacts;
    } catch (error) {
      throw new Error(
        `Error getting all trusted contacts: ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if user has set trusted contacts
   */
  async hasTrustedContacts(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const count = await TrustedContact.countDocuments({
        userId,
        isActive: true,
      });
      return count > 0;
    } catch (error) {
      throw new Error(
        `Error checking trusted contacts: ${(error as Error).message}`
      );
    }
  }
}

export default new TrustedContactService();
