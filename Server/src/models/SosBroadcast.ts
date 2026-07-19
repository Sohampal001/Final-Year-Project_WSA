import { model, Schema, type Types } from "mongoose";

export interface ISosRecipient {
  userId: Types.ObjectId;
  name?: string;
  mobile?: string;
  distance?: number;
  expoPushToken?: string;
  status?: "SENT" | "FAILED";
  ticketId?: string;
  error?: string;
  sentAt?: Date;
}

export interface ISosBroadcast {
  victimUserId: Types.ObjectId;
  victimName?: string;
  victimMobile?: string;
  triggerType: "VOICE" | "BUTTON";
  location: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  recipients: ISosRecipient[];
  notifiedCount: number;
}

const SosRecipientSchema = new Schema<ISosRecipient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    mobile: { type: String },
    distance: { type: Number },
    expoPushToken: { type: String },
    status: {
      type: String,
      enum: ["SENT", "FAILED"],
    },
    ticketId: { type: String },
    error: { type: String },
    sentAt: { type: Date },
  },
  { _id: false },
);

const SosBroadcastSchema = new Schema<ISosBroadcast>(
  {
    victimUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    victimName: { type: String },
    victimMobile: { type: String },

    triggerType: {
      type: String,
      enum: ["VOICE", "BUTTON"],
      default: "BUTTON",
    },

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    radius: { type: Number },

    recipients: { type: [SosRecipientSchema], default: [] },

    notifiedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SosBroadcast = model<ISosBroadcast>(
  "SosBroadcast",
  SosBroadcastSchema,
);
