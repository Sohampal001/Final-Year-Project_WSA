import express from "express";
import {
  addGuardian,
  getGuardians,
  updateGuardian,
  deleteGuardian,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  sendAadhaarOTP,
  verifyAadhaarOTP,
  getAadhaar,
  getOnboardingStatus,
} from "../controllers/onboardingController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// All onboarding routes require authentication
router.use(authenticate);

// Onboarding status
router.get("/status", getOnboardingStatus);

// Guardian management
router.post("/guardian", addGuardian);
router.get("/guardians", getGuardians);
router.put("/guardian/:id", updateGuardian);
router.delete("/guardian/:id", deleteGuardian);

// Address management
router.post("/address", addAddress);
router.get("/addresses", getAddresses);
router.put("/address/:id", updateAddress);
router.delete("/address/:id", deleteAddress);

// Aadhaar verification
router.post("/aadhaar/send-otp", sendAadhaarOTP);
router.post("/aadhaar/verify-otp", verifyAadhaarOTP);
router.get("/aadhaar", getAadhaar);

export const onboardingRoute = router;
