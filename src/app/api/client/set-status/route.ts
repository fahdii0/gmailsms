import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { setStatus } from "@/lib/smsbower";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purchaseId, status } = await req.json();

    if (!purchaseId || !status || !["cancel", "finish"].includes(status)) {
      return NextResponse.json(
        { error: "Purchase ID and valid status (cancel/finish) are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId: payload.userId,
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    if (purchase.status !== "active") {
      return NextResponse.json(
        { error: "This purchase is no longer active" },
        { status: 400 }
      );
    }

    // Call SMSBower API
    const result = await setStatus(purchase.mailId, status);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update status" },
        { status: 502 }
      );
    }

    // Update purchase status
    purchase.status = status === "cancel" ? "cancelled" : "completed";
    await purchase.save();

    return NextResponse.json({
      message: `Purchase ${status === "cancel" ? "cancelled" : "completed"} successfully`,
      status: purchase.status,
    });
  } catch (error) {
    console.error("Set status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
