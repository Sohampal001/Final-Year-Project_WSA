import { model, Schema, Types } from "mongoose";

export interface IVolunteer {
  userId: Types.ObjectId;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  availabilityStatus: "ONLINE" | "OFFLINE";
  lastActiveAt?: Date;
}

const VolunteerSchema = new Schema<IVolunteer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    availabilityStatus: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "OFFLINE",
    },

    lastActiveAt: Date,
  },
  { timestamps: true }
);

export const Volunteer = model<IVolunteer>("Volunteer", VolunteerSchema);
