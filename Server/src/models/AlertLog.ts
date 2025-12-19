import { model, Schema, Types } from "mongoose";

export interface IAlertLog {
  sosId: Types.ObjectId;
  targetType: "GUARDIAN" | "VOLUNTEER" | "POLICE";
  targetId?: Types.ObjectId;
  status: "SENT" | "FAILED";
}

const AlertLogSchema = new Schema<IAlertLog>(
  {
    sosId: { type: Schema.Types.ObjectId, ref: "SOSEvent", required: true },

    targetType: {
      type: String,
      enum: ["GUARDIAN", "VOLUNTEER", "POLICE"],
      required: true,
    },

    targetId: { type: Schema.Types.ObjectId },

    status: { type: String, enum: ["SENT", "FAILED"], required: true },
  },
  { timestamps: true }
);

export const AlertLog = model<IAlertLog>("AlertLog", AlertLogSchema);
