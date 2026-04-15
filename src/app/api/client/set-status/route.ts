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

    // Just update database - NO API CALL
    if (action === "cancel") {
      purchase.status = "cancelled";
      await purchase.save();
      return NextResponse.json({ success: true, message: "Cancelled" });
    }

    if (action === "finish") {
      purchase.status = "completed";
      await purchase.save();
      return NextResponse.json({ success: true, message: "Completed" });
    }
    
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
