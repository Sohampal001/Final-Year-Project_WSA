import { model, Schema, type Types } from "mongoose";

export interface ITrustedContact {
  userId: Types.ObjectId;
  name: string;
  mobile: string;
  relationship: string;
  isGuardian: boolean;
  isActive: boolean;
}

const TrustedContactSchema = new Schema<ITrustedContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    mobile: { type: String, required: true },
    relationship: { type: String },

    isGuardian: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TrustedContact = model<ITrustedContact>(
  "TrustedContact",
  TrustedContactSchema
);
