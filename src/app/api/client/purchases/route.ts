import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // ✅ FILTER OUT cancelled purchases
    const purchases = await Purchase.find({
      userId: payload.userId,
      status: { $in: ["active", "completed"] }  // Only show these
    }).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({ purchases });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
