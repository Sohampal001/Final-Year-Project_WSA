import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import FormData from "form-data";

// Point fluent-ffmpeg at the bundled binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

/**
 * Convert any audio buffer to WAV using ffmpeg
 */
export const convertToWav = (inputPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `sos_${Date.now()}.wav`);

    ffmpeg(inputPath)
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => resolve(outputPath))
      .on("error", (err) =>
        reject(new Error(`FFmpeg conversion failed: ${err.message}`)),
      )
      .save(outputPath);
  });
};

/**
 * Upload WAV file to Cloudinary (free tier, raw resource type)
 */
export const uploadToCloudinary = async (
  filePath: string,
  userId: string,
): Promise<{ url: string; publicId: string }> => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "raw",
    folder: `aegis/sos_audio/${userId}`,
    public_id: `sos_${Date.now()}`,
    overwrite: false,
  });

  return { url: result.secure_url, publicId: result.public_id };
};

/**
 * Call the risk-level classification API with the WAV file.
 * API docs: POST /analyze_audio — multipart/form-data, field name: "file"
 * Constraints: WAV only, ≤35 seconds
 * Cold start: ~20-30s, warm: ~3-8s → use 90s timeout
 */
export const analyzeAudioRisk = async (
  wavPath: string,
): Promise<{
  original_text: string;
  romanized_text: string;
  translated_text: string;
  risk_level: string;
  score: number;
} | null> => {
  try {
    const RISK_API_URL =
      process.env.RISK_API_URL ||
      "https://explorer13-risk-level-classification.hf.space/analyze_audio";

    const form = new FormData();
    // Field name MUST be "file" as per API docs
    form.append("file", fs.createReadStream(wavPath), {
      filename: "audio.wav",
      contentType: "audio/wav",
    });

    console.log("🔍 [Risk API] Sending WAV to:", RISK_API_URL);

    const response = await axios.post(RISK_API_URL, form, {
      headers: form.getHeaders(),
      timeout: 90000, // 90s — accounts for HuggingFace cold start (~20-30s)
    });

    console.log("✅ [Risk API] Response:", response.data);
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail ?? err?.message;
    console.error(`⚠️ [Risk API] Failed (${status ?? "network"}): ${detail}`);
    return null; // Non-fatal — recording is still saved and contacts notified
  }
};

/**
 * Clean up temp files
 */
export const cleanupTempFiles = (...filePaths: string[]) => {
  for (const fp of filePaths) {
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch {
      // ignore cleanup errors
    }
  }
};
