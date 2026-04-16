import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting } from "@/models/Settings";

// Fixed API function
async function getActivation(service: string) {
  const API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv"; // Use full key
  const BASE_URL = "https://smsbower.app/api/mail"; // Fixed: .app not .page
  
  const url = `${BASE_URL}/getActivation?api_key=${API_KEY}&service=${service}&domain=gmail.com&alias=0`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (data.status === 1) {
      return {
        success: true,
        mailId: data.mailId,
        email: data.mail,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to get activation",
      };
    }
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      error: "API connection failed",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get service type from request body
    const body = await req.json();
    const { serviceType } = body;
    
    // RESTRICTION: ONLY allow gmail or facebook
    if (!serviceType || (serviceType !== "gmail" && serviceType !== "facebook")) {
      return NextResponse.json(
        { error: "Invalid service. Allowed services: gmail, facebook only" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get price based on service type
    const price = serviceType === "gmail" 
      ? Number(await getSetting("gmail_price", "25"))
      : Number(await getSetting("facebook_price", "20"));

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.balance < price) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${price} PKR. Current balance: ${user.balance} PKR` },
        { status: 400 }
      );
    }

    // Map service to API service code
    const serviceCode = serviceType === "gmail" ? "ot" : "fb";
    const result = await getActivation(serviceCode);

    if (!result.success || !result.mailId || !result.email) {
      return NextResponse.json(
        { error: result.error || `Failed to get ${serviceType} activation` },
        { status: 502 }
      );
    }

    // Deduct balance
    user.balance -= price;
    await user.save();

    // Create purchase record
    const purchase = await Purchase.create({
      userId: user._id,
      mailId: result.mailId,
      email: result.email,
      service: serviceType,
      price: price,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase._id,
        mailId: purchase.mailId,
        email: purchase.email,
        service: purchase.service,
        price: purchase.price,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
      newBalance: user.balance,
    });
  } catch (error) {
    console.error("Buy service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
