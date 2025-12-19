import type { Request, Response } from "express";
import trustedContactService from "../services/TrustedContactService";

/**
 * Add a trusted contact
 */
export const addTrustedContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, mobile, relationship } = req.body;

    if (!name || !mobile || !relationship) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile, and relationship are required",
      });
    }

    const result = await trustedContactService.addTrustedContact(
      userId!,
      name,
      mobile,
      relationship
    );

    return res.status(result.success ? 201 : 400).json(result);
  } catch (error: unknown) {
    console.error("❌ Add Trusted Contact Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get all trusted contacts for authenticated user
 */
export const getTrustedContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const contacts = await trustedContactService.getTrustedContacts(userId!);

    return res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error: unknown) {
    console.error("❌ Get Trusted Contacts Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Deactivate a trusted contact (soft delete)
 */
export const deactivateTrustedContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: "Contact ID is required",
      });
    }

    const result = await trustedContactService.deactivateTrustedContact(
      userId!,
      contactId
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: unknown) {
    console.error(
      "❌ Deactivate Trusted Contact Error:",
      (error as Error).message
    );
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Delete a trusted contact permanently (hard delete)
 */
export const deleteTrustedContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: "Contact ID is required",
      });
    }

    const result = await trustedContactService.deleteTrustedContact(
      userId!,
      contactId
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: unknown) {
    console.error("❌ Delete Trusted Contact Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Update a trusted contact
 */
export const updateTrustedContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contactId } = req.params;
    const { name, relationship } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: "Contact ID is required",
      });
    }

    if (!name && !relationship) {
      return res.status(400).json({
        success: false,
        message: "At least one field (name or relationship) must be provided",
      });
    }

    const result = await trustedContactService.updateTrustedContact(
      userId!,
      contactId,
      { name, relationship }
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: unknown) {
    console.error("❌ Update Trusted Contact Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Get all trusted contacts including inactive ones
 */
export const getAllTrustedContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const includeInactive = req.query.includeInactive === "true";

    const contacts = await trustedContactService.getAllTrustedContacts(
      userId!,
      includeInactive
    );

    return res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error: unknown) {
    console.error(
      "❌ Get All Trusted Contacts Error:",
      (error as Error).message
    );
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

/**
 * Check if user has trusted contacts
 */
export const hasTrustedContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const hasTrusted = await trustedContactService.hasTrustedContacts(userId!);

    return res.status(200).json({
      success: true,
      data: { hasTrustedContacts: hasTrusted },
    });
  } catch (error: unknown) {
    console.error("❌ Check Trusted Contacts Error:", (error as Error).message);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
