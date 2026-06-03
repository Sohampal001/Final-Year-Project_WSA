import express from "express";
import multer from "multer";
import os from "os";
import {
  uploadSosAudio,
  getMyRecordings,
} from "../controllers/audioController.ts";
import { authenticate } from "../middlewares/auth.ts";

// Store uploaded files in OS temp dir
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

export const audioRoute = express
  .Router()
  .post("/upload", authenticate, upload.single("audio"), uploadSosAudio)
  .get("/my-recordings", authenticate, getMyRecordings);
