import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: "user" | "admin";
  provider: "local" | "google";
  googleId?: string;
  preferences: {
    interests: string[];
    travelStyle?: string;
    budgetRange?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, default: null },
    preferences: {
      interests: { type: [String], default: [] },
      travelStyle: { type: String, default: "" },
      budgetRange: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
