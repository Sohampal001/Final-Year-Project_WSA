import express from "express";
import {
  sendOTP,
  verifyOTP,
  getOTPStatus,
  deleteOTP,
} from "../controllers/otpController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// All OTP routes require authentication
router.use(authenticate);

/**
 * POST /api/otp/send
 * Send OTP to user
 * Body: { type: string, purpose: string, email?: string, mobile?: string }
 * Types: AADHAAR, SIGNUP, EMAIL_VERIFICATION, MOBILE_VERIFICATION, PASSWORD_RESET
 */
router.post("/send", sendOTP);

/**
 * POST /api/otp/verify
 * Verify OTP
 * Body: { type: string, otp: string }
 */
router.post("/verify", verifyOTP);

/**
 * GET /api/otp/status?type=<type>
 * Get OTP status for a specific type
 * Query: type (AADHAAR, SIGNUP, EMAIL_VERIFICATION, MOBILE_VERIFICATION, PASSWORD_RESET)
 */
router.get("/status", getOTPStatus);

/**
 * DELETE /api/otp
 * Delete OTP for a specific type
 * Body: { type: string }
 */
router.delete("/", deleteOTP);

export const otpRoute = router;
