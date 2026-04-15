import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import User from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purchaseId, action } = await req.json();

    if (!purchaseId || !["cancel", "finish"].includes(action)) {
      return NextResponse.json(
        { error: "Purchase ID and action (cancel/finish) required" },
        { status: 400 }
      );
    }

    await connectDB();

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId: payload.userId,
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // CANCEL: Cashback + Remove from history
    if (action === "cancel") {
      // Add cashback to user balance
      const user = await User.findById(payload.userId);
      if (user) {
        user.balance += purchase.price;
        await user.save();
      }

      // Delete the purchase (disappears from history)
      await Purchase.deleteOne({ _id: purchaseId });

      return NextResponse.json({
        success: true,
        message: "Cancelled with cashback",
        refundAmount: purchase.price,
        newBalance: user?.balance || 0
      });
    }

    // FINISH: Just mark completed (no cashback)
    if (action === "finish") {
      purchase.status = "completed";
      await purchase.save();

      return NextResponse.json({
        success: true,
        message: "Completed"
      });
    }
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
