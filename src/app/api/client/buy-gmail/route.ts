import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting } from "@/models/Settings";
import { getActivation } from "@/lib/smsbower";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const gmailPrice = Number(await getSetting("gmail_price", "25"));

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.balance < gmailPrice) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${gmailPrice} PKR. Current balance: ${user.balance} PKR` },
        { status: 400 }
      );
    }

    const result = await getActivation("fb", "gmail.com");

    if (!result.success || !result.mailId || !result.email) {
      return NextResponse.json(
        { error: result.error || "Failed to get Gmail activation" },
        { status: 502 }
      );
    }

    // Deduct balance
    user.balance -= gmailPrice;
    await user.save();

    // Create purchase record
    const purchase = await Purchase.create({
      userId: user._id,
      mailId: result.mailId,
      email: result.email,
      service: "fb",
      price: gmailPrice,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase._id,
        mailId: purchase.mailId,
        email: purchase.email,
        price: purchase.price,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
      newBalance: user.balance,
    });
  } catch (error) {
    console.error("Buy Gmail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
