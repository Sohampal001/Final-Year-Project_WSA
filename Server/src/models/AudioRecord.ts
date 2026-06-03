import { Schema, model, Types, Document } from "mongoose";

export interface IAudioRecord extends Document {
  userId: Types.ObjectId;
  sosEventId?: Types.ObjectId;
  triggerType: "VOICE" | "BUTTON";
  // Storage
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  durationSeconds: number;
  // Location at time of recording
  latitude?: number;
  longitude?: number;
  googleMapsLink?: string;
  // Risk analysis
  riskAnalysis?: {
    originalText: string;
    romanizedText: string;
    translatedText: string;
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    score: number;
  };
  // Notification status
  smsSent: boolean;
  emailSent: boolean;
  notifiedContacts: string[];
  recordedAt: Date;
}

const AudioRecordSchema = new Schema<IAudioRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sosEventId: { type: Schema.Types.ObjectId, ref: "SOSEvent" },
    triggerType: { type: String, enum: ["VOICE", "BUTTON"], required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    durationSeconds: { type: Number, default: 30 },
    latitude: Number,
    longitude: Number,
    googleMapsLink: String,
    riskAnalysis: {
      originalText: String,
      romanizedText: String,
      translatedText: String,
      riskLevel: { type: String, enum: ["Low", "Medium", "High", "Critical"] },
      score: Number,
    },
    smsSent: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    notifiedContacts: [String],
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

AudioRecordSchema.index({ userId: 1, recordedAt: -1 });

export const AudioRecord = model<IAudioRecord>(
  "AudioRecord",
  AudioRecordSchema,
);
