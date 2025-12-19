import { model, Schema, type Types } from "mongoose";

export interface IGuardian {
  userId: Types.ObjectId; // woman
  name: string;
  relationship: string;
  mobile: string;
  email?: string;
  aadhaarLast4?: string;
  priority: number;
  isVerified: boolean;
}

const GuardianSchema = new Schema<IGuardian>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    relationship: { type: String, required: true },

    mobile: { type: String, required: true },
    email: String,

    aadhaarLast4: String,
    priority: { type: Number, default: 1 },

    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Guardian = model<IGuardian>("Guardian", GuardianSchema);
