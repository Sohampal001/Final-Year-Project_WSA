import type { Request, Response } from "express";
import onboardingService from "../services/OnboardingService";

/**
 * Add guardian
 */
export const addGuardian = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { name, relationship, mobile, email, aadhaarLast4, priority } =
      req.body;

    // Validation
    if (!name || !relationship || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Name, relationship, and mobile are required",
      });
    }

    // Validate mobile number (basic validation)
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const guardian = await onboardingService.addGuardian(userId, {
      name,
      relationship,
      mobile,
      email,
      aadhaarLast4,
      priority,
    });

    return res.status(201).json({
      success: true,
      message: "Guardian added successfully",
      data: guardian,
    });
  } catch (error: unknown) {
    console.error("❌ Add Guardian Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get all guardians for authenticated user
 */
export const getGuardians = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const guardians = await onboardingService.getGuardians(userId);

    return res.status(200).json({
      success: true,
      count: guardians.length,
      data: guardians,
    });
  } catch (error: unknown) {
    console.error("❌ Get Guardians Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update guardian
 */
export const updateGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const guardian = await onboardingService.updateGuardian(id, updateData);

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: "Guardian not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Guardian updated successfully",
      data: guardian,
    });
  } catch (error: unknown) {
    console.error("❌ Update Guardian Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete guardian
 */
export const deleteGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Guardian ID is required",
      });
    }
    const result = await onboardingService.deleteGuardian(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Guardian not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Guardian deleted successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Delete Guardian Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Add address
 */
export const addAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { type, fullAddress, latitude, longitude } = req.body;

    // Validation
    if (
      !type ||
      !fullAddress ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Type, full address, latitude, and longitude are required",
      });
    }

    if (!["HOME", "WORK", "OTHER"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be HOME, WORK, or OTHER",
      });
    }

    // Validate coordinates
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    const address = await onboardingService.addAddress(userId, {
      type,
      fullAddress,
      latitude,
      longitude,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: address,
    });
  } catch (error: unknown) {
    console.error("❌ Add Address Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get all addresses for authenticated user
 */
export const getAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const addresses = await onboardingService.getAddresses(userId);

    return res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error: unknown) {
    console.error("❌ Get Addresses Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update address
 */
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const address = await onboardingService.updateAddress(id, updateData);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error: unknown) {
    console.error("❌ Update Address Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete address
 */
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const result = await onboardingService.deleteAddress(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Delete Address Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Send OTP for Aadhaar verification
 * OTP is sent to user's registered email
 */
export const sendAadhaarOTP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { aadhaarNumber } = req.body;

    // Validation
    if (!aadhaarNumber) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar number is required",
      });
    }

    const result = await onboardingService.sendAadhaarOTP(
      userId,
      aadhaarNumber
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("❌ Send Aadhaar OTP Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Verify Aadhaar with OTP
 */
export const verifyAadhaarOTP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { otp } = req.body;

    // Validation
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    const aadhaar = await onboardingService.verifyAadhaarOTP(userId, otp);

    return res.status(200).json({
      success: true,
      message: "Aadhaar verified successfully",
      data: {
        aadhaarLast4: aadhaar.aadhaarLast4,
        verifiedAt: aadhaar.verifiedAt,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Verify Aadhaar OTP Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get Aadhaar details
 */
export const getAadhaar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const aadhaar = await onboardingService.getAadhaar(userId);

    if (!aadhaar) {
      return res.status(404).json({
        success: false,
        message: "Aadhaar not verified yet",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        aadhaarLast4: aadhaar.aadhaarLast4,
        verifiedAt: aadhaar.verifiedAt,
        verificationProvider: aadhaar.verificationProvider,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Get Aadhaar Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get onboarding status
 */
export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const status = await onboardingService.getOnboardingStatus(userId);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    console.error("❌ Get Onboarding Status Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
