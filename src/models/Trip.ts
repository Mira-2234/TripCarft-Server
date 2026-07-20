import mongoose, { Schema, Document } from "mongoose";

export interface ITrip extends Document {
  title: string;
  country: string;
  description: string;
  imageUrl: string;
  gallery: string[];
  budget: number;
  duration: number;
  travelDate: Date;
  category: string;
  rating: number;
  ratingCount: number;
  travelPlan: { day: number; title: string; details: string }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    title: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    gallery: { type: [String], default: [] },
    budget: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    travelDate: { type: Date, required: true },
    category: {
      type: String,
      required: true,
      enum: ["Adventure", "Beach", "Cultural", "Mountain", "City", "Wildlife", "Luxury", "Budget"],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    travelPlan: [
      {
        day: Number,
        title: String,
        details: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TripSchema.index({ title: "text", country: "text", description: "text" });

export default mongoose.model<ITrip>("Trip", TripSchema);
