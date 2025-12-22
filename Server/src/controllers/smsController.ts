import type { Request, Response } from "express";
import FAST2SMS from "../services/SMSService";
import EmailService from "../services/EmailService";
import SMSHistoryService from "../services/SMSHistoryService";
import { TrustedContact } from "../models/TrustedContact";
import { Guardian } from "../models/Guardian";
import { User } from "../models/User";

interface AuthRequest extends Request {
  userId?: string;
}

export const sendSMS = async (req: AuthRequest, res: Response) => {
  console.log("🔥 === SMS CONTROLLER STARTED ===");
  console.log("📥 Request Body:", JSON.stringify(req.body, null, 2));
  console.log("🔐 Auth User Object:", req.user);

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("❌ No userId found in req.user");
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("✅ User authenticated, userId:", userId);

    let { location, numbersArray, latitude, longitude } = req.body;

    console.log("📱 SOS Request from User:", userId);
    console.log("📍 Location Data:", { latitude, longitude, link: location });
    console.log("📞 Numbers Array Received:", numbersArray);

    // Fetch user details from database
    const user = await User.findById(userId).select("name email mobile");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("👤 User Details:", {
      name: user.name,
      mobile: user.mobile,
      email: user.email,
    });

    // If no numbers provided or empty array, fetch from database
    if (!numbersArray || numbersArray.length === 0) {
      console.log("⚠️ No numbers provided, fetching trusted contacts from DB");
      console.log("🔍 Query: { userId:", userId, ", isActive: true }");

      const trustedContacts = await TrustedContact.find({
        userId,
        isActive: true,
      }).select("mobile name");

      console.log(`🔍 Trusted contacts query result:`, trustedContacts);

      if (trustedContacts.length === 0) {
        console.log("❌ No trusted contacts found in database");
        return res.status(400).json({
          success: false,
          message:
            "No trusted contacts found. Please add trusted contacts first.",
        });
      }

      numbersArray = trustedContacts.map((contact) => contact.mobile);
      console.log(
        `✅ Extracted ${numbersArray.length} phone numbers from DB:`,
        numbersArray
      );
    } else {
      console.log(
        `✅ Using ${numbersArray.length} provided numbers:`,
        numbersArray
      );
    }

    console.log("📞 Final numbers array for SMS:", numbersArray);

    // Create Google Maps link if not provided
    if (!location && latitude && longitude) {
      location = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      console.log("🗺️ Generated Google Maps link:", location);
    } else {
      console.log("🗺️ Using provided location link:", location);
    }

    // Create detailed SMS message with user details
    console.log("📝 Creating SMS message...");
    const message = `🚨 EMERGENCY ALERT! 
${user.name} needs immediate help!

Contact: ${user.mobile}
${user.email ? `Email: ${user.email}` : ""}

📍 Live Location: ${location}

Please check on them immediately or call emergency services.`;

    console.log("📝 SMS Message created, length:", message.length);
    console.log("📝 Message preview:", message.substring(0, 100) + "...");

    // Send SMS to all trusted contacts
    console.log("📤 Calling SMS service...");
    const smsResponse = await FAST2SMS.sendMessage(message, numbersArray);
    console.log(
      "📤 SMS Service Response:",
      JSON.stringify(smsResponse, null, 2)
    );

    // Fetch guardian email for email notification
    let guardianEmail: string | undefined;
    let emailSent = false;

    console.log("🔍 Fetching guardian details...");
    const guardian = await Guardian.findOne({ userId }).select("email name");
    if (guardian?.email) {
      guardianEmail = guardian.email;
      console.log("📧 Guardian email found:", guardianEmail);
      console.log("📧 Sending email to guardian...");

      try {
        const emailSubject = `🚨 EMERGENCY: ${user.name} needs help!`;
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1>🚨 EMERGENCY ALERT</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb;">
              <h2>${user.name} has triggered an emergency SOS!</h2>
              
              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3>User Details:</h3>
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Mobile:</strong> ${user.mobile}</p>
                ${
                  user.email
                    ? `<p><strong>Email:</strong> ${user.email}</p>`
                    : ""
                }
              </div>

              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3>📍 Current Location:</h3>
                ${
                  latitude && longitude
                    ? `<p><strong>Coordinates:</strong> ${latitude}, ${longitude}</p>`
                    : ""
                }
                <p><a href="${location}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View on Google Maps</a></p>
              </div>

              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 0; color: #991b1b; font-weight: bold;">⚠️ Please check on ${
                  user.name
                } immediately or contact emergency services!</p>
              </div>

              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated emergency alert from Suraksha Safety App. Sent at ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `;

        await EmailService.sendEmail(guardianEmail, emailSubject, emailBody);
        emailSent = true;
        console.log("✅ Email sent to guardian successfully");
      } catch (emailError) {
        console.error("❌ Failed to send email to guardian:", emailError);
      }
    } else {
      console.log("⚠️ No guardian found or no email set");
    }

    // Save SMS history to database
    console.log("💾 Saving SMS history to database...");
    const status = smsResponse?.sent ? "sent" : "failed";
    console.log("📊 SMS Status:", status);

    await SMSHistoryService.saveSMSHistory({
      userId,
      recipients: numbersArray,
      message,
      location: {
        latitude: latitude || 0,
        longitude: longitude || 0,
        googleMapsLink: location,
      },
      status,
      requestId: smsResponse?.request_id,
      userDetails: {
        name: user.name,
        mobile: user.mobile || "",
        ...(user.email && { email: user.email }),
      },
      ...(guardianEmail && { guardianEmail }),
      emailSent,
      ...(smsResponse?.sent ? {} : { error: "SMS sending failed" }),
    });

    console.log("✅ SMS history saved to database");

    if (smsResponse?.sent) {
      console.log("🎉 SMS sent successfully!");
      console.log("📊 Response data:", {
        smsCount: numbersArray.length,
        emailSent,
        requestId: smsResponse.request_id,
      });
      return res.status(200).json({
        success: true,
        sent: true,
        message: "Emergency alerts sent successfully",
        data: {
          smsCount: numbersArray.length,
          emailSent,
          requestId: smsResponse.request_id,
        },
      });
    } else {
      console.log("❌ SMS sending failed");
      return res.status(500).json({
        success: false,
        sent: false,
        message: "Failed to send SMS alerts",
      });
    }
  } catch (error: unknown) {
    console.error("💥 === SMS CONTROLLER ERROR ===");
    console.error("❌ Error Type:", error?.constructor?.name);
    console.error("❌ Error Message:", (error as Error).message);
    console.error("❌ Error Stack:", (error as Error).stack);

    // Try to save failed attempt to history
    if (req.user?.id) {
      console.log("💾 Attempting to save failed SMS attempt to history...");
      try {
        await SMSHistoryService.saveSMSHistory({
          userId: req.user.id,
          recipients: req.body.numbersArray || [],
          message: "Error occurred before message could be sent",
          location: {
            latitude: req.body.latitude || 0,
            longitude: req.body.longitude || 0,
            googleMapsLink: req.body.location || "",
          },
          status: "failed",
          userDetails: {
            name: "Unknown",
            mobile: "Unknown",
          },
          emailSent: false,
          error: (error as Error).message,
        });
        console.log("✅ Failed attempt saved to history");
      } catch (historyError) {
        console.error("❌ Failed to save error to history:", historyError);
      }
    } else {
      console.log("⚠️ No user ID available to save failed attempt");
    }

    console.log("📤 Sending error response to client");
    return res.status(500).json({
      success: false,
      sent: false,
      message: (error as Error).message,
    });
  }
};
