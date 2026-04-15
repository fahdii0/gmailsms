import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";

async function setStatusInAPI(mailId: number, action: string) {
  const API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
  const BASE_URL = "https://smsbower.app/api/mail";
  
  const statusCode = action === "cancel" ? 2 : 3;
  const url = `${BASE_URL}/setStatus?api_key=${API_KEY}&id=${mailId}&status=${statusCode}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 1) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    return { success: false, error: "API connection failed" };
  }
}

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

    // RULE 3: Cannot cancel if code already received
    if (action === "cancel" && purchase.verificationCode) {
      return NextResponse.json(
        { error: "Cannot cancel - verification code already received" },
        { status: 400 }
      );
    }

    // Check if already completed
    if (purchase.status === "completed") {
      return NextResponse.json(
        { error: "Purchase already completed" },
        { status: 400 }
      );
    }

    // Call API
    const result = await setStatusInAPI(purchase.mailId, action);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update status" },
        { status: 502 }
      );
    }

    // Update local status
    purchase.status = action === "cancel" ? "cancelled" : "completed";
    await purchase.save();

    return NextResponse.json({
      success: true,
      message: `Purchase ${action === "cancel" ? "cancelled" : "completed"} successfully`,
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
