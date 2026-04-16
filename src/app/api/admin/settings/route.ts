import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting, setSetting } from "@/models/Settings";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== "admin") {
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
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gmailPrice, whatsappNumber } = await req.json();

    if (!gmailPrice || gmailPrice <= 0) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    await connectDB();

    await setSetting("gmail_price", String(gmailPrice));
    if (typeof whatsappNumber === "string") {
      await setSetting("whatsapp_number", whatsappNumber.trim());
    }

    return NextResponse.json({
      message: `Gmail price updated to ${gmailPrice} PKR`,
      gmailPrice,
      whatsappNumber: typeof whatsappNumber === "string" ? whatsappNumber.trim() : undefined,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
