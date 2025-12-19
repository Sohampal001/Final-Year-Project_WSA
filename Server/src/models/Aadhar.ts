import { model, Schema, type Types } from "mongoose";

export interface IAadhaar {
  userId: Types.ObjectId;
  aadhaarHash: string;
  aadhaarLast4: string;
  verifiedAt: Date;
  verificationProvider: string;
}

const AadhaarSchema = new Schema<IAadhaar>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    aadhaarHash: { type: String, unique: true, required: true },
    aadhaarLast4: { type: String, required: true },

    verifiedAt: { type: Date, required: true },
    verificationProvider: { type: String },
  },
  { timestamps: true }
);

export const Aadhaar = model<IAadhaar>("Aadhaar", AadhaarSchema);
