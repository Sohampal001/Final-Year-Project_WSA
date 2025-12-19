import { Schema, model, Types, Document } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  mobile?: string;
  password: string;
  roles: ("USER" | "GUARDIAN" | "VOLUNTEER")[];
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  setTrustedContacts: boolean;
  isGuardianVerified: boolean;
  isAadhaarVerified: boolean;
  aadhaarNumber?: string;
  homeAddress?: string;
  workAddress?: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  lastLoginAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },

    email: { type: String, unique: true, sparse: true },
    mobile: { type: String, unique: true, sparse: true },

    password: { type: String, required: true },

    roles: {
      type: [String],
      enum: ["USER", "GUARDIAN", "VOLUNTEER"],
      default: ["USER"],
    },

    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    setTrustedContacts: { type: Boolean, default: false },
    isGuardianVerified: { type: Boolean, default: false },
    isAadhaarVerified: { type: Boolean, default: false },

    aadhaarNumber: { type: String },
    homeAddress: { type: String },
    workAddress: { type: String },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DELETED"],
      default: "ACTIVE",
    },

    lastLoginAt: Date,
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
