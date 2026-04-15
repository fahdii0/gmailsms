import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Purchase from "@/models/Purchase";
import { getUserFromRequest } from "@/lib/auth";

async function getCodeFromAPI(mailId: number) {
  const API_KEY = "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
  const BASE_URL = "https://smsbower.app/api/mail";
  
  const url = `${BASE_URL}/getCode?api_key=${API_KEY}&mailId=${mailId}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 1) {
      return { success: true, code: data.code };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    return { success: false, error: "API connection failed" };
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

    // Check if already completed
    if (purchase.status === "completed") {
      return NextResponse.json({
        success: true,
        code: purchase.verificationCode,
        message: "Code already received",
      });
    }

    // Check if cancelled
    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { error: "This purchase has been cancelled" },
        { status: 400 }
      );
    }

    // RULE 1: Check 25-minute timeout
    const timeElapsed = (Date.now() - new Date(purchase.createdAt).getTime()) / 1000;
    if (timeElapsed > 1500) { // 25 minutes = 1500 seconds
      purchase.status = "expired";
      await purchase.save();
      return NextResponse.json(
        { error: "25-minute timeout reached. No code received. Purchase expired." },
        { status: 400 }
      );
    }

    // RULE 2: Check 3-attempt limit
    const codeCheckCount = purchase.codeCheckCount || 0;
    
    if (codeCheckCount >= 3) {
      return NextResponse.json(
        { error: "Maximum code check limit (3) reached. Please cancel this purchase." },
        { status: 400 }
      );
    }

    // Call SMSBower API to get code
    const result = await getCodeFromAPI(purchase.mailId);
    
    // Increment check count
    purchase.codeCheckCount = codeCheckCount + 1;
    
    if (result.success && result.code) {
      // Code received!
      purchase.verificationCode = result.code;
      purchase.status = "completed";
      await purchase.save();
      
      return NextResponse.json({
        success: true,
        code: result.code,
        message: "Verification code received!",
        attemptsUsed: purchase.codeCheckCount,
      });
    } else {
      // No code yet
      await purchase.save();
      
      const remainingAttempts = 3 - purchase.codeCheckCount;
      const remainingTime = Math.max(0, 1500 - timeElapsed);
      
      let errorMessage = "No verification code received yet";
      if (result.error?.includes("not received yet")) {
        errorMessage = `Waiting for code... (Attempt ${purchase.codeCheckCount}/3)`;
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        attemptsUsed: purchase.codeCheckCount,
        remainingAttempts: remainingAttempts,
        remainingSeconds: Math.floor(remainingTime),
        remainingMinutes: Math.floor(remainingTime / 60),
        canCancel: true,
      });
    }
    
  } catch (error) {
    console.error("Get code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
