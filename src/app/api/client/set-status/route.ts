import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import User from "@/models/User";  // ← ADD THIS
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

    // ✅ CASHBACK on cancel
    if (action === "cancel") {
      // Only allow cancel if still active
      if (purchase.status !== "active") {
        return NextResponse.json(
          { error: "Can only cancel active purchases" },
          { status: 400 }
        );
      }

      // Add cashback to user balance
      const user = await User.findById(payload.userId);
      if (user) {
        user.balance += purchase.price;
        await user.save();
      }

      // Mark as cancelled
      purchase.status = "cancelled";
      await purchase.save();

      return NextResponse.json({
        success: true,
        message: "Cancelled with cashback",
        refundAmount: purchase.price,
        newBalance: user?.balance
      });
    }

    // ✅ NO CASHBACK on finish
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
