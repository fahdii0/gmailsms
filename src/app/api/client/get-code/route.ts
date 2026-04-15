import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";

// Fixed API function for getting code
async function getCodeFromAPI(mailId: number) {
  const API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv"; // Use your full key
  const BASE_URL = "https://smsbower.app/api/mail"; // Fixed: .app not .page
  
  const url = `${BASE_URL}/getCode?api_key=${API_KEY}&mailId=${mailId}`;
  
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
        code: data.code,
        fullMessage: data.message || data.code,
      };
    } else {
      // Handle specific error messages from API
      let errorMessage = data.error || "Failed to get code";
      
      if (errorMessage.includes("Code has not been received yet")) {
        errorMessage = "Verification code not received yet. Please wait and try again in 30 seconds.";
      } else if (errorMessage.includes("Pass mail id")) {
        errorMessage = "Invalid mail ID. Please try purchasing again.";
      } else if (errorMessage.includes("Activation is already canceled")) {
        errorMessage = "This email activation has been cancelled.";
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      error: "Failed to connect to SMSBower API",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purchaseId } = await req.json();

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId: payload.userId,
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    if (purchase.status !== "active") {
      return NextResponse.json(
        { error: "This purchase is no longer active" },
        { status: 400 }
      );
    }

    // Call SMSBower API with fixed function
    const result = await getCodeFromAPI(purchase.mailId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get verification code" },
        { status: 200 } // Keep 200 so frontend can show the error message
      );
    }

    // Save code to purchase
    if (result.code) {
      purchase.verificationCode = result.code;
      purchase.status = "completed"; // Mark as completed once code is retrieved
      await purchase.save();
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      fullMessage: result.fullMessage,
    });
  } catch (error) {
    console.error("Get code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
