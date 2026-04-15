import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  mailId: string;
  email: string;
  service: string;
  price: number;
  status: "active" | "completed" | "cancelled";
  verificationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mailId: { type: String, required: true },
    email: { type: String, required: true },
    service: { type: String, default: "google" },
    price: { type: Number, required: true },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
    verificationCode: { type: String },
  },
  { timestamps: true }
);

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
