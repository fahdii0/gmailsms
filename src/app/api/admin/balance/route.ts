import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, amount } = await req.json();

    if (!clientId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Client ID and a positive amount are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const client = await User.findById(clientId);
    if (!client || client.role !== "client") {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    client.balance += amount;
    await client.save();

    return NextResponse.json({
      message: `Added ${amount} PKR to ${client.name}'s balance`,
      newBalance: client.balance,
    });
  } catch (error) {
    console.error("Add balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
