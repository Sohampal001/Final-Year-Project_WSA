import type { Request, Response } from "express";
import otpService from "../services/OTPService";

/**
 * Send OTP
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type, purpose, email, mobile } = req.body;

    // Validation
    if (!type || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Type and purpose are required",
      });
    }

    const validTypes = [
      "AADHAAR",
      "SIGNUP",
      "EMAIL_VERIFICATION",
      "MOBILE_VERIFICATION",
      "PASSWORD_RESET",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Either email or mobile must be provided",
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Validate mobile format if provided
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const result = await otpService.createOTP(userId, type, purpose, {
      email,
      mobile,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Send OTP Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type, otp } = req.body;

    // Validation
    if (!type || !otp) {
      return res.status(400).json({
        success: false,
        message: "Type and OTP are required",
      });
    }

    const validTypes = [
      "AADHAAR",
      "SIGNUP",
      "EMAIL_VERIFICATION",
      "MOBILE_VERIFICATION",
      "PASSWORD_RESET",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    const result = await otpService.verifyOTP(userId, type, otp);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Verify OTP Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get OTP status
 */
export const getOTPStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const validTypes = [
      "AADHAAR",
      "SIGNUP",
      "EMAIL_VERIFICATION",
      "MOBILE_VERIFICATION",
      "PASSWORD_RESET",
    ];
    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    const otp = await otpService.getOTP(
      userId,
      type as
        | "AADHAAR"
        | "SIGNUP"
        | "EMAIL_VERIFICATION"
        | "MOBILE_VERIFICATION"
        | "PASSWORD_RESET"
    );

    if (!otp) {
      return res.status(404).json({
        success: false,
        message: "No active OTP found",
      });
    }

    const remainingMinutes = Math.ceil(
      (otp.expiresAt.getTime() - Date.now()) / 60000
    );

    return res.status(200).json({
      success: true,
      data: {
        type: otp.type,
        purpose: otp.purpose,
        expiresIn: `${remainingMinutes} minute(s)`,
        sentTo: otp.email ? `Email: ${otp.email}` : `Mobile: ${otp.mobile}`,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Get OTP Status Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete OTP
 */
export const deleteOTP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const validTypes = [
      "AADHAAR",
      "SIGNUP",
      "EMAIL_VERIFICATION",
      "MOBILE_VERIFICATION",
      "PASSWORD_RESET",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    const result = await otpService.deleteOTP(userId, type);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No OTP found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP deleted successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Delete OTP Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
