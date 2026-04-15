import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  mailId: number;  // Changed to Number
  email: string;
  service: string;
  price: number;
  status: "active" | "completed" | "cancelled" | "expired";
  verificationCode?: string;
  codeCheckCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mailId: { type: Number, required: true },  // Changed to Number
    email: { type: String, required: true },
    service: { type: String, default: "google" },
    price: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active" 
    },
    verificationCode: { type: String },
    codeCheckCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
