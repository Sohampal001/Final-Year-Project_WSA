import mongoose, { Schema, Document } from "mongoose";

export interface ISMSHistory extends Document {
  userId: mongoose.Types.ObjectId;
  recipients: string[]; // Array of phone numbers
  message: string;
  location: {
    latitude: number;
    longitude: number;
    googleMapsLink: string;
  };
  sentAt: Date;
  status: "sent" | "failed";
  requestId?: string; // SMS service request ID
  userDetails: {
    name: string;
    mobile: string;
    email?: string;
  };
  guardianEmail?: string;
  emailSent: boolean;
  error?: string;
}

const SMSHistorySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipients: {
      type: [String],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      googleMapsLink: {
        type: String,
        required: true,
      },
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
    },
    requestId: {
      type: String,
    },
    userDetails: {
      name: {
        type: String,
        required: true,
      },
      mobile: {
        type: String,
        required: true,
      },
      email: {
        type: String,
      },
    },
    guardianEmail: {
      type: String,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying by user and date
SMSHistorySchema.index({ userId: 1, sentAt: -1 });

export const SMSHistory = mongoose.model<ISMSHistory>(
  "SMSHistory",
  SMSHistorySchema
);
