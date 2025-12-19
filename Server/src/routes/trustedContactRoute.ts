import express from "express";
import {
  addTrustedContact,
  getTrustedContacts,
  getAllTrustedContacts,
  deleteTrustedContact,
  deactivateTrustedContact,
  updateTrustedContact,
  hasTrustedContacts,
} from "../controllers/trustedContactController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Trusted contact routes
router.post("/", addTrustedContact); // Add a trusted contact
router.get("/", getTrustedContacts); // Get all active trusted contacts
router.get("/all", getAllTrustedContacts); // Get all trusted contacts (including inactive)
router.get("/check", hasTrustedContacts); // Check if user has trusted contacts
router.put("/:contactId", updateTrustedContact); // Update a trusted contact
router.patch("/:contactId/deactivate", deactivateTrustedContact); // Deactivate a trusted contact (soft delete)
router.delete("/:contactId", deleteTrustedContact); // Delete a trusted contact permanently (hard delete)

export const trustedContactRoute = router;
