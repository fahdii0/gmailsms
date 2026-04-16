import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";
import { getSetting } from "@/models/Settings";

const SMSBOWER_API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";

async function getActivation(serviceType: "gmail" | "facebook") {
  // Map service to API service code
  const serviceCode = serviceType === "gmail" ? "ot" : "fb";
  const domain = serviceType === "gmail" ? "gmail.com" : "";
  
  const params = new URLSearchParams({
    api_key: SMSBOWER_API_KEY,
    service: serviceCode,
    ref: "",
    maxPrice: ""
  });
  
  if (domain) {
    params.append("domain", domain);
  }
  
  const url = `${SMSBOWER_BASE_URL}getActivation?${params.toString()}`;
  
  console.log("Calling API:", url.replace(SMSBOWER_API_KEY, "HIDDEN"));
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15 second timeout
    });
    
    const responseText = await response.text();
    console.log("Raw API response:", responseText);
    
    let activationId = null;
    let emailAddress = null;
    
    // Parse response (handles both JSON and string responses like the Express version)
    if (typeof responseText === "string") {
      if (responseText.includes("ACCESS_ACTIVATION")) {
        const parts = responseText.split(":");
        activationId = parts[1];
        emailAddress = parts[2];
      } else if (responseText.includes(":")) {
        const parts = responseText.split(":");
        activationId = parts[0];
        emailAddress = parts[1];
      }
    }
    
    // Try JSON parse
    try {
      const data = JSON.parse(responseText);
      if (data.status === 1 || data.status === "1") {
        activationId = data.mailId || data.id || data.activationId;
        emailAddress = data.mail || data.email;
      }
    } catch (e) {
      // Not JSON, that's fine
    }
    
    if (activationId && emailAddress) {
      return {
        success: true,
        mailId: activationId,
        email: emailAddress,
      };
    } else {
      return {
        success: false,
        error: responseText || "Failed to get activation",
      };
    }
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "API connection failed",
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
    
    console.log("Requested service type:", serviceType);
    
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

    // Get activation from API
    const result = await getActivation(serviceType);

    if (!result.success || !result.mailId || !result.email) {
      return NextResponse.json(
        { error: result.error || `Failed to get ${serviceType} account` },
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
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
