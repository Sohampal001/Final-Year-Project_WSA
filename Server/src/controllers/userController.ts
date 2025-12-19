import type { Request, Response } from "express";
import userService from "../services/UserService";
import { generateToken } from "../middlewares/auth";

/**
 * Sign up a new user
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, roles } = req.body;

    // Validation
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Either email or mobile is required",
      });
    }

    // Create user
    const user = await userService.signup({
      name,
      email,
      mobile,
      password,
      roles,
    });

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.roles);

    // Remove password from response
    const userResponse: any = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
      token,
    });
  } catch (error: unknown) {
    console.error("❌ Signup Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
      });
    }

    // Verify credentials
    const user = await userService.login(identifier, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.roles);

    // Remove password from response
    const userResponse: any = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: userResponse,
      token,
    });
  } catch (error: unknown) {
    console.error("❌ Login Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await userService.findUserById(id!);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove password from response
    const userResponse: any = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      data: userResponse,
    });
  } catch (error: unknown) {
    console.error("❌ Get User Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await userService.updateUser(id!, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove password from response
    const userResponse: any = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userResponse,
    });
  } catch (error: unknown) {
    console.error("❌ Update User Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update password
 */
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    await userService.updatePassword(id!, oldPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Update Password Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};


/**
 * Add role to user
 */
export const addRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const user = await userService.addRole(id!, role);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Role added successfully",
      data: { roles: user.roles },
    });
  } catch (error: unknown) {
    console.error("❌ Add Role Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Remove role from user
 */
export const removeRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const user = await userService.removeRole(id!, role);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Role removed successfully",
      data: { roles: user.roles },
    });
  } catch (error: unknown) {
    console.error("❌ Remove Role Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Suspend user
 */
export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await userService.suspendUser(id!);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User suspended successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Suspend User Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Activate user
 */
export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await userService.activateUser(id!);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User activated successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Activate User Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete user (soft delete)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await userService.deleteUser(id!);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Delete User Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get all users with filters
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { status, roles, isEmailVerified, isMobileVerified } = req.query;

    const filters: {
      status?: "ACTIVE" | "SUSPENDED" | "DELETED";
      roles?: ("USER" | "GUARDIAN" | "VOLUNTEER")[];
      isEmailVerified?: boolean;
      isMobileVerified?: boolean;
    } = {};

    if (status) {
      filters.status = status as "ACTIVE" | "SUSPENDED" | "DELETED";
    }

    if (roles) {
      filters.roles = (Array.isArray(roles) ? roles : [roles]) as (
        | "USER"
        | "GUARDIAN"
        | "VOLUNTEER"
      )[];
    }

    if (isEmailVerified !== undefined) {
      filters.isEmailVerified = isEmailVerified === "true";
    }

    if (isMobileVerified !== undefined) {
      filters.isMobileVerified = isMobileVerified === "true";
    }

    const users = await userService.getAllUsers(filters);

    // Remove passwords from response
    const usersResponse = users.map((user) => {
      const userObj: any = user.toObject();
      delete userObj.password;
      return userObj;
    });

    return res.status(200).json({
      success: true,
      count: usersResponse.length,
      data: usersResponse,
    });
  } catch (error: unknown) {
    console.error("❌ Get All Users Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Check if user exists
 */
export const checkUserExists = async (req: Request, res: Response) => {
  try {
    const { identifier, type } = req.query;

    if (!identifier || !type) {
      return res.status(400).json({
        success: false,
        message: "Identifier and type are required",
      });
    }

    if (type !== "email" && type !== "mobile") {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'email' or 'mobile'",
      });
    }

    const exists = await userService.userExists(
      identifier as string,
      type as "email" | "mobile"
    );

    return res.status(200).json({
      success: true,
      exists,
    });
  } catch (error: unknown) {
    console.error("❌ Check User Exists Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
