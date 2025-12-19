import { Schema, model, Types, Document } from "mongoose";

export interface IOTP extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  otp: string;
  type:
    | "AADHAAR"
    | "SIGNUP"
    | "EMAIL_VERIFICATION"
    | "MOBILE_VERIFICATION"
    | "PASSWORD_RESET";
  purpose: string;
  email?: string;
  mobile?: string;
  isVerified: boolean;
  expiresAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "AADHAAR",
        "SIGNUP",
        "EMAIL_VERIFICATION",
        "MOBILE_VERIFICATION",
        "PASSWORD_RESET",
      ],
      required: true,
    },

    purpose: {
      type: String,
      required: true,
    },

    email: {
      type: String,
    },

    mobile: {
      type: String,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - MongoDB will auto-delete expired documents
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
OTPSchema.index({ userId: 1, type: 1 });

export const OTP = model<IOTP>("OTP", OTPSchema);
