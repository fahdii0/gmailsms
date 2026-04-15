import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    await connectDB();

    const query = clientId ? { userId: clientId } : {};
    const purchases = await Purchase.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("Get purchases error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
