import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting } from "@/models/Settings";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const gmailPrice = await getSetting("gmail_price", "25");
    const whatsappNumber = await getSetting("whatsapp_number", "");

    return NextResponse.json({
      gmailPrice: Number(gmailPrice),
      whatsappNumber,
    });
  } catch (error) {
    console.error("Get client settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}