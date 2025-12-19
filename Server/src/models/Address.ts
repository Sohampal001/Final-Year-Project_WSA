import { model, Schema, type Types } from "mongoose";

export interface IAddress {
  userId: Types.ObjectId;
  type: "HOME" | "WORK" | "OTHER";
  fullAddress: string;
  latitude: number;
  longitude: number;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["HOME", "WORK", "OTHER"], required: true },
    fullAddress: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Address = model<IAddress>("Address", AddressSchema);
