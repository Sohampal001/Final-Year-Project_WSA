import { model, Schema, type Types } from "mongoose";

export interface ISOSEvent {
  userId: Types.ObjectId;
  triggerType: "VOICE" | "BUTTON" | "AUTO";
  status: "ACTIVE" | "RESOLVED" | "ESCALATED";
  startedAt: Date;
  endedAt?: Date;
}

const SOSEventSchema = new Schema<ISOSEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    triggerType: {
      type: String,
      enum: ["VOICE", "BUTTON", "AUTO"],
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED", "ESCALATED"],
      default: "ACTIVE",
    },

    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  { timestamps: true }
);

export const SOSEvent = model<ISOSEvent>("SOSEvent", SOSEventSchema);
