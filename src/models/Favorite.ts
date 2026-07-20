import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ user: 1, trip: 1 }, { unique: true });

export default mongoose.model<IFavorite>("Favorite", FavoriteSchema);
