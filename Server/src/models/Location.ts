import { Schema, model, Types, Document } from "mongoose";

export interface ILocation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      min: 0,
    },
    altitude: {
      type: Number,
    },
    speed: {
      type: Number,
      min: 0,
    },
    heading: {
      type: Number,
      min: 0,
      max: 360,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for geospatial queries
LocationSchema.index({ latitude: 1, longitude: 1 });

// Index for user's location history queries
LocationSchema.index({ userId: 1, timestamp: -1 });

export const Location = model<ILocation>("Location", LocationSchema);
