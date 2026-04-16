import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting } from "@/models/Settings";

// Fixed: Correct API base URL from documentation
const API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const BASE_URL = "https://smsbower.app/api/mail"; // Changed from .app to .page

// Map service names to API service codes
const SERVICE_MAP = {
  gmail: "ot",  // "ot" = Any Other (works for Gmail)
  facebook: "fb"
};

async function getActivation(service: "gmail" | "facebook") {
  const serviceCode = SERVICE_MAP[service];
  const domain = service === "gmail" ? "gmail.com" : "";
  
  let url = `${BASE_URL}/getActivation?api_key=${API_KEY}&service=${serviceCode}`;
  
  // Add domain only for Gmail
  if (domain) {
    url += `&domain=${domain}`;
  }
  
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

    // Get service from request body
    const body = await req.json();
    const { serviceType } = body; // Expected: "gmail" or "facebook"
    
    if (!serviceType || !["gmail", "facebook"].includes(serviceType)) {
      return NextResponse.json(
        { error: "Invalid service. Allowed: gmail, facebook" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get price based on service type
    const priceSetting = serviceType === "gmail" ? "gmail_price" : "facebook_price";
    const price = Number(await getSetting(priceSetting, serviceType === "gmail" ? "25" : "20"));

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

    // Call API with correct service
    const result = await getActivation(serviceType);

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
