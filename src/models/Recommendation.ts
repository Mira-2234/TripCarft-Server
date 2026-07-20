import mongoose, { Schema, Document } from "mongoose";

export interface IRecommendation extends Document {
  user: mongoose.Types.ObjectId;
  trips: mongoose.Types.ObjectId[];
  reason: string;
  basedOn: {
    interests: string[];
    budgetRange?: string;
    season?: string;
  };
  createdAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trips: [{ type: Schema.Types.ObjectId, ref: "Trip" }],
    reason: { type: String, required: true },
    basedOn: {
      interests: { type: [String], default: [] },
      budgetRange: { type: String, default: "" },
      season: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IRecommendation>("Recommendation", RecommendationSchema);
