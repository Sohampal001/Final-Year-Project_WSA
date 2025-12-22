import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Types } from "mongoose";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        mobile: string;
        roles: ("USER" | "GUARDIAN" | "VOLUNTEER")[];
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, roles: string[]): string => {
  return jwt.sign({ userId, roles }, JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

/**
 * Authentication middleware - Verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login.",
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is not active. Please contact support.",
      });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email!,
      mobile: user.mobile!,
      roles: user.roles,
    };

    next();
  } catch (error) {
    console.error("❌ Authentication Error:", (error as Error).message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
    });
  }
};

/**
 * Authorization middleware - Checks if user has required roles
 */
export const authorize = (
  ...allowedRoles: ("USER" | "GUARDIAN" | "VOLUNTEER")[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // Check if user has at least one of the allowed roles
      const hasRole = req.user.roles.some((role) =>
        allowedRoles.includes(role)
      );

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource.",
        });
      }

      next();
    } catch (error) {
      console.error("❌ Authorization Error:", (error as Error).message);
      return res.status(403).json({
        success: false,
        message: "Authorization failed.",
      });
    }
  };
};

/**
 * Check if user is the owner of a resource or has admin role
 */
export const checkOwnership = (resourceUserIdField: string = "userId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // Get resource user ID from params or body
      const resourceUserId =
        req.params[resourceUserIdField] || req.body[resourceUserIdField];

      // Check if user is the owner
      if (resourceUserId && resourceUserId !== req.user.id) {
        // Check if user is admin/volunteer (can access other users' resources)
        const hasAdminRole = req.user.roles.includes("VOLUNTEER");

        if (!hasAdminRole) {
          return res.status(403).json({
            success: false,
            message: "You can only access your own resources.",
          });
        }
      }

      next();
    } catch (error) {
      console.error("❌ Ownership Check Error:", (error as Error).message);
      return res.status(403).json({
        success: false,
        message: "Authorization failed.",
      });
    }
  };
};

/**
 * Optional authentication - Doesn't fail if no token is provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select("-password");

    if (user && user.status === "ACTIVE") {
      req.user = {
        id: user._id.toString(),
        userId: user._id.toString(),
        email: user.email!,
        mobile: user.mobile!,
        roles: user.roles,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Verify email or mobile
 */
export const requireVerification = (type: "email" | "mobile" | "both") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (type === "email" && !user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email verification required.",
        });
      }

      if (type === "mobile" && !user.isMobileVerified) {
        return res.status(403).json({
          success: false,
          message: "Mobile verification required.",
        });
      }

      if (
        type === "both" &&
        (!user.isEmailVerified || !user.isMobileVerified)
      ) {
        return res.status(403).json({
          success: false,
          message: "Email and mobile verification required.",
        });
      }

      next();
    } catch (error) {
      console.error("❌ Verification Check Error:", (error as Error).message);
      return res.status(500).json({
        success: false,
        message: "Verification check failed.",
      });
    }
  };
};
