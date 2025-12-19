import { User, type IUser } from "../models/User";
import { Types } from "mongoose";
import bcrypt from "bcrypt";

export class UserService {
  /**
   * Sign up a new user with hashed password
   */
  async signup(userData: {
    name: string;
    email?: string;
    mobile?: string;
    password: string;
    roles?: ("USER" | "GUARDIAN" | "VOLUNTEER")[];
  }): Promise<IUser> {
    try {
      // Check if user already exists
      if (userData.email) {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          throw new Error("User with this email already exists");
        }
      }

      if (userData.mobile) {
        const existingUser = await User.findOne({ mobile: userData.mobile });
        if (existingUser) {
          throw new Error("User with this mobile number already exists");
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        roles: userData.roles || ["USER"],
      });

      return user;
    } catch (error) {
      throw new Error(`Error creating user: ${(error as Error).message}`);
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ email });
      return user;
    } catch (error) {
      throw new Error(
        `Error finding user by email: ${(error as Error).message}`
      );
    }
  }

  /**
   * Find user by mobile
   */
  async findUserByMobile(mobile: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ mobile });
      return user;
    } catch (error) {
      throw new Error(
        `Error finding user by mobile: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string | Types.ObjectId,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      // Don't allow direct password updates through this method
      if (updateData.password) {
        delete updateData.password;
      }

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      });

      return user;
    } catch (error) {
      throw new Error(`Error updating user: ${(error as Error).message}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string | Types.ObjectId,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Verify old password
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error("Invalid old password");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedPassword;
      await user.save();

      return true;
    } catch (error) {
      throw new Error(`Error updating password: ${(error as Error).message}`);
    }
  }

  /**
   * Login user with credentials
   */
  async login(identifier: string, password: string): Promise<IUser | null> {
    try {
      // Find user by email or mobile
      const user = await User.findOne({
        $or: [{ email: identifier }, { mobile: identifier }],
      });

      if (!user) {
        return null;
      }

      // Check if account is active
      if (user.status !== "ACTIVE") {
        throw new Error("Account is not active");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      return user;
    } catch (error) {
      throw new Error(
        `Error verifying credentials: ${(error as Error).message}`
      );
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isEmailVerified: true },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(`Error verifying email: ${(error as Error).message}`);
    }
  }

  /**
   * Verify user mobile
   */
  async verifyMobile(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isMobileVerified: true },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(`Error verifying mobile: ${(error as Error).message}`);
    }
  }

  /**
   * Update trusted contacts status
   */
  async updateTrustedContactsStatus(
    userId: string | Types.ObjectId,
    status: boolean
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { setTrustedContacts: status },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(
        `Error updating trusted contacts status: ${(error as Error).message}`
      );
    }
  }

  /**
   * Update guardian verification status
   */
  async updateGuardianVerificationStatus(
    userId: string | Types.ObjectId,
    status: boolean
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isGuardianVerified: status },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(
        `Error updating guardian verification: ${(error as Error).message}`
      );
    }
  }

  /**
   * Add role to user
   */
  async addRole(
    userId: string | Types.ObjectId,
    role: "USER" | "GUARDIAN" | "VOLUNTEER"
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.roles.includes(role)) {
        user.roles.push(role);
        await user.save();
      }

      return user;
    } catch (error) {
      throw new Error(`Error adding role: ${(error as Error).message}`);
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: string | Types.ObjectId,
    role: "USER" | "GUARDIAN" | "VOLUNTEER"
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      user.roles = user.roles.filter((r) => r !== role);
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Error removing role: ${(error as Error).message}`);
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { status: "SUSPENDED" },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(`Error suspending user: ${(error as Error).message}`);
    }
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { status: "ACTIVE" },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(`Error activating user: ${(error as Error).message}`);
    }
  }

  /**
   * Soft delete user
   */
  async deleteUser(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { status: "DELETED" },
        { new: true }
      );
      return user;
    } catch (error) {
      throw new Error(`Error deleting user: ${(error as Error).message}`);
    }
  }

  /**
   * Get all users with filters
   */
  async getAllUsers(filters?: {
    status?: "ACTIVE" | "SUSPENDED" | "DELETED";
    roles?: ("USER" | "GUARDIAN" | "VOLUNTEER")[];
    isEmailVerified?: boolean;
    isMobileVerified?: boolean;
  }): Promise<IUser[]> {
    try {
      const query: any = {};

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.roles && filters.roles.length > 0) {
        query.roles = { $in: filters.roles };
      }

      if (filters?.isEmailVerified !== undefined) {
        query.isEmailVerified = filters.isEmailVerified;
      }

      if (filters?.isMobileVerified !== undefined) {
        query.isMobileVerified = filters.isMobileVerified;
      }

      const users = await User.find(query);
      return users;
    } catch (error) {
      throw new Error(`Error getting all users: ${(error as Error).message}`);
    }
  }

  /**
   * Check if user exists
   */
  async userExists(
    identifier: string,
    type: "email" | "mobile"
  ): Promise<boolean> {
    try {
      const query =
        type === "email" ? { email: identifier } : { mobile: identifier };
      const user = await User.findOne(query);
      return !!user;
    } catch (error) {
      throw new Error(
        `Error checking user existence: ${(error as Error).message}`
      );
    }
  }
}

export default new UserService();
