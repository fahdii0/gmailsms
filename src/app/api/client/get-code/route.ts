import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { getCode } from "@/lib/smsbower";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purchaseId } = await req.json();

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
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
    const result = await getCode(purchase.mailId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get verification code" },
        { status: 200 }
      );
    }

    // Save code to purchase
    if (result.code) {
      purchase.verificationCode = result.code;
      await purchase.save();
    }

    return NextResponse.json({
      code: result.code,
      fullMessage: result.fullMessage,
    });
  } catch (error) {
    console.error("Get code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
