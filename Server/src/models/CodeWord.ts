import { model, Schema, type Types } from "mongoose";

export interface ICodeWord {
  userId: Types.ObjectId;
  codeWord: string;
  createdAt: Date;
  updatedAt: Date;
}

const CodeWordSchema = new Schema<ICodeWord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    codeWord: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const CodeWord = model<ICodeWord>("CodeWord", CodeWordSchema);
