import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  travelers: number;
  totalCost: number;
  status: "pending" | "confirmed" | "cancelled";
  bookingDate: Date;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    travelers: { type: Number, required: true, min: 1, default: 1 },
    totalCost: { type: Number, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    bookingDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IBooking>("Booking", BookingSchema);
