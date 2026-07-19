// @ts-nocheck  — multer + express type augmentation conflicts with exactOptionalPropertyTypes
import type { Request, Response } from "express";
import {
  convertToWav,
  uploadToCloudinary,
  analyzeAudioRisk,
  cleanupTempFiles,
} from "../services/AudioService.ts";
import { AudioRecord } from "../models/AudioRecord.ts";
import { User } from "../models/User.ts";
import { TrustedContact } from "../models/TrustedContact.ts";
import { Guardian } from "../models/Guardian.ts";
import EmailService from "../services/EmailService.ts";
import FAST2SMS from "../services/SMSService.ts";

/**
 * POST /api/audio/upload
 * Receives audio file from client after SOS trigger,
 * converts to WAV, uploads to Cloudinary, runs risk analysis,
 * saves to DB, notifies contacts.
 */
export const uploadSosAudio = async (req: Request, res: Response) => {
  const tempInputPath: string | undefined = (req as any).file?.path;
  let wavPath: string | null = null;

  try {
    const userId: string | undefined = (req as any).user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    if (!(req as any).file) {
      return res
        .status(400)
        .json({ success: false, message: "No audio file provided" });
    }

    const { triggerType = "VOICE", latitude, longitude } = req.body;

    console.log(
      `🎙️ [Audio] Received SOS audio from user ${userId}, size: ${(req as any).file.size} bytes`,
    );

    // 1. Convert to WAV
    console.log("🔄 [Audio] Converting to WAV...");
    wavPath = await convertToWav(tempInputPath!);
    console.log("✅ [Audio] WAV conversion done:", wavPath);

    // 2. Upload to Cloudinary
    console.log("☁️ [Audio] Uploading to Cloudinary...");
    const { url: cloudinaryUrl, publicId: cloudinaryPublicId } =
      await uploadToCloudinary(wavPath, userId);
    console.log("✅ [Audio] Uploaded:", cloudinaryUrl);

    // 3. Risk analysis (non-blocking — we respond after saving)
    console.log("🔍 [Audio] Calling risk classification API...");
    const riskResult = await analyzeAudioRisk(wavPath);
    console.log("✅ [Audio] Risk result:", riskResult);

    // 4. Build location data
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lon = longitude ? parseFloat(longitude) : undefined;
    const googleMapsLink =
      lat && lon
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : undefined;

    // 5. Save to DB
    const createData: any = {
      userId,
      triggerType,
      cloudinaryUrl,
      cloudinaryPublicId,
      durationSeconds: 30,
      recordedAt: new Date(),
    };
    if (lat !== undefined) createData.latitude = lat;
    if (lon !== undefined) createData.longitude = lon;
    if (googleMapsLink) createData.googleMapsLink = googleMapsLink;
    if (riskResult) {
      createData.riskAnalysis = {
        originalText: riskResult.original_text,
        romanizedText: riskResult.romanized_text,
        translatedText: riskResult.translated_text,
        riskLevel: riskResult.risk_level,
        score: riskResult.score,
      };
    }

    const audioRecord = await AudioRecord.create(createData);
    console.log("✅ [Audio] Saved to DB:", audioRecord._id);

    // Respond to the client NOW — the recording is safely uploaded + saved.
    // Contact notification (SMS/email) runs afterwards on the server, so a slow
    // or blacklisted SMS provider can never make the client think the upload
    // failed (that was the "audio upload failed" network timeout).
    res.status(200).json({
      success: true,
      message: "SOS audio processed successfully",
      data: {
        audioId: audioRecord._id,
        cloudinaryUrl,
        riskAnalysis: riskResult,
      },
    });

    // 6. Notify trusted contacts
    const user = await User.findById(userId).select("name mobile email");
    const trustedContacts = await TrustedContact.find({
      userId,
      isActive: true,
    }).select("mobile name");
    const guardian = await Guardian.findOne({ userId }).select("email name");

    const phoneNumbers: string[] = trustedContacts
      .map((c: any) => c.mobile)
      .filter(Boolean);
    const isProd = process.env.NODE_ENV === "production";
    // SMS only goes out when explicitly enabled. When false we skip Fast2SMS
    // entirely (avoids the "IP blacklisted" error) — email still goes out.
    const SEND_SMS = process.env.SEND_SMS === "true";

    const riskBadge = riskResult
      ? `Risk Level: ${riskResult.risk_level} (score: ${riskResult.score.toFixed(2)})`
      : "Risk analysis unavailable";

    // Match the same format as the initial SOS SMS so contacts get consistent messages
    const smsMessage = `🚨 EMERGENCY AUDIO ALERT!
${user?.name} needs immediate help!

Contact: ${user?.mobile}
${user?.email ? `Email: ${user?.email}` : ""}

📍 Live Location: ${googleMapsLink ?? "Unavailable"}

🎙️ 30s Audio Recording: ${cloudinaryUrl}
🔍 ${riskBadge}
${riskResult?.translated_text ? `Transcription: "${riskResult.translated_text}"` : ""}

Please check on them immediately or call emergency services.`;

    let smsSent = false;
    let emailSent = false;
    const notifiedContacts: string[] = [];

    // ── SMS (only when SEND_SMS is enabled) ───────────────────────────────────
    if (SEND_SMS && isProd && phoneNumbers.length > 0) {
      try {
        await FAST2SMS.sendMessage(smsMessage, phoneNumbers);
        smsSent = true;
        notifiedContacts.push(...phoneNumbers);
        console.log("✅ [Audio] SMS sent to", phoneNumbers.length, "contacts");
      } catch (e) {
        console.error("❌ [Audio] SMS failed:", (e as Error).message);
        // SMS failed — email will still go out below
      }
    } else {
      console.log("📵 [Audio] SMS skipped (SEND_SMS off or dev). Email only.");
    }

    // ── Email (always attempted — guardian + any trusted contact emails) ──────
    const riskColor =
      riskResult?.risk_level === "High" || riskResult?.risk_level === "Critical"
        ? "#dc2626"
        : riskResult?.risk_level === "Medium"
          ? "#d97706"
          : "#16a34a";

    const emailSubject = `🚨 EMERGENCY AUDIO: ${user?.name} needs help!`;
    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#dc2626;color:white;padding:20px;text-align:center;">
          <h1>🚨 SOS AUDIO ALERT</h1>
          ${!isProd ? '<p style="background:#b91c1c;padding:6px 12px;border-radius:4px;font-size:13px;">⚠️ DEV MODE — SMS skipped. Email only.</p>' : ""}
        </div>
        <div style="padding:20px;background:#f9fafb;">
          <h2>${user?.name} has triggered an emergency SOS with audio recording!</h2>
          <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;">
            <h3>User Details</h3>
            <p><strong>Name:</strong> ${user?.name}</p>
            <p><strong>Mobile:</strong> ${user?.mobile}</p>
            ${user?.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ""}
          </div>
          ${
            googleMapsLink
              ? `
          <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;">
            <h3>📍 Location</h3>
            <p>${lat}, ${lon}</p>
            <a href="${googleMapsLink}" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">View on Google Maps</a>
          </div>`
              : ""
          }
          <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;">
            <h3>🎙️ Audio Recording</h3>
            <a href="${cloudinaryUrl}" style="background:#0ea5e9;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Listen to Recording</a>
          </div>
          ${
            riskResult
              ? `
          <div style="background:white;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid ${riskColor};">
            <h3>🔍 Risk Analysis</h3>
            <p><strong>Risk Level:</strong> <span style="color:${riskColor};font-weight:bold;">${riskResult.risk_level}</span> (score: ${riskResult.score.toFixed(2)})</p>
            <p><strong>Transcription:</strong> ${riskResult.translated_text}</p>
            <p style="color:#6b7280;font-size:12px;">Original: ${riskResult.original_text}</p>
            <p style="color:#6b7280;font-size:12px;">Romanized: ${riskResult.romanized_text}</p>
          </div>`
              : ""
          }
          <div style="background:#fef2f2;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #dc2626;">
            <p style="margin:0;color:#991b1b;font-weight:bold;">⚠️ Please check on ${user?.name} immediately or contact emergency services!</p>
          </div>
          <p style="color:#6b7280;font-size:12px;margin-top:20px;">Sent at ${new Date().toLocaleString()} — Raksha Safety App</p>
        </div>
      </div>`;

    // Collect all email recipients: guardian + trusted contacts with email
    const emailRecipients: string[] = [];
    if (guardian?.email) emailRecipients.push(guardian.email);

    // Send to each recipient independently so one failure doesn't block others
    for (const email of emailRecipients) {
      try {
        await EmailService.sendEmail(email, emailSubject, emailBody);
        emailSent = true;
        notifiedContacts.push(email);
        console.log("✅ [Audio] Email sent to:", email);
      } catch (e) {
        console.error(
          `❌ [Audio] Email to ${email} failed:`,
          (e as Error).message,
        );
      }
    }

    if (emailRecipients.length === 0) {
      console.warn(
        "⚠️ [Audio] No email recipients found (no guardian email set)",
      );
    }

    // 7. Update record with notification status
    await AudioRecord.findByIdAndUpdate(audioRecord._id, {
      smsSent,
      emailSent,
      notifiedContacts,
    });

    // Client was already told success right after the DB save; nothing more to
    // return. The notification status lives in the AudioRecord update above.
    console.log("✅ [Audio] Notifications done. smsSent:", smsSent, "emailSent:", emailSent);
    return;
  } catch (error) {
    console.error("❌ [Audio] Controller error:", (error as Error).message);
    // Only respond if we haven't already sent the 200 (i.e. failure happened
    // before/at the upload+save stage). A post-response error just logs.
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
    return;
  } finally {
    cleanupTempFiles(...([tempInputPath, wavPath].filter(Boolean) as string[]));
  }
};

/**
 * GET /api/audio/my-recordings
 * Returns all SOS audio recordings for the authenticated user
 */
export const getMyRecordings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const recordings = await AudioRecord.find({ userId })
      .sort({ recordedAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: recordings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
