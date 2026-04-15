import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
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

    // Handle CANCEL - Immediately mark as cancelled
    if (action === "cancel") {
      // ✅ Don't call SMSBower API
      // ✅ Just mark as cancelled in database
      purchase.status = "cancelled";
      await purchase.save();
      
      return NextResponse.json({
        success: true,
        message: "Purchase cancelled immediately. No further code fetching allowed.",
        status: "cancelled"
      });
    }

    // Handle FINISH - Mark as completed
    if (action === "finish") {
      purchase.status = "completed";
      await purchase.save();
      
      return NextResponse.json({
        success: true,
        message: "Purchase completed successfully",
        status: "completed"
      });
    }
    
  } catch (error) {
    console.error("Set status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
