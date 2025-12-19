import express from "express";
import {
  setCodeWord,
  getCodeWord,
  matchCodeWord,
  updateCodeWord,
  deleteCodeWord,
  hasCodeWord,
} from "../controllers/codeWordController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Code word routes
router.post("/set", setCodeWord); // Set or update code word
router.get("/get", getCodeWord); // Get code word
router.post("/match", matchCodeWord); // Match code word
router.put("/update", updateCodeWord); // Update code word with verification
router.delete("/delete", deleteCodeWord); // Delete code word
router.get("/exists", hasCodeWord); // Check if code word exists

export const codeWordRoute = router;
