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

    // Initialize codes array if it doesn't exist
    if (!purchase.allCodes) {
      purchase.allCodes = [];
    }

    // ✅ STOP if cancelled
    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { error: "This purchase has been cancelled. Cannot fetch verification code." },
        { status: 400 }
      );
    }

    // ✅ STOP if expired
    if (purchase.status === "expired") {
      return NextResponse.json(
        { error: "Purchase expired after 25 minutes. Cannot fetch code." },
        { status: 400 }
      );
    }

    // ✅ STOP if manually completed by user
    if (purchase.status === "completed") {
      return NextResponse.json({
        success: true,
        allCodes: purchase.allCodes,
        latestCode: purchase.verificationCode,
        message: "Purchase already completed",
      });
    }

    // Check 25-minute timeout
    const timeElapsed = (Date.now() - new Date(purchase.createdAt).getTime()) / 1000;
    if (timeElapsed > 1500) {
      purchase.status = "expired";
      await purchase.save();
      return NextResponse.json(
        { error: "25-minute timeout reached. Purchase expired." },
        { status: 400 }
      );
    }

    // Call SMSBower API to get code
    const result = await getCodeFromAPI(Number(purchase.mailId));
    
    if (result.success && result.code) {
      // Check if this code is new (not already in allCodes)
      const isNewCode = !purchase.allCodes.includes(result.code);
      
      if (isNewCode) {
        // Add to allCodes array
        purchase.allCodes.push(result.code);
        // Update verificationCode to latest
        purchase.verificationCode = result.code;
        
        // Only auto-complete on first code or keep scanning if user wants multiple
        // You can change this behavior based on your needs
        if (!purchase.status || purchase.status === "pending") {
          purchase.status = "completed";
        }
        
        await purchase.save();
        
        return NextResponse.json({
          success: true,
          newCode: result.code,
          allCodes: purchase.allCodes,
          latestCode: result.code,
          message: `New code received! (Total: ${purchase.allCodes.length})`,
          attemptsUsed: purchase.codeCheckCount || 0,
          remainingSeconds: Math.floor(1500 - timeElapsed),
        });
      } else {
        // Same code as before
        await purchase.save();
        
        const remainingTime = Math.max(0, 1500 - timeElapsed);
        
        return NextResponse.json({
          success: false,
          error: "No new code yet. Waiting for new SMS...",
          allCodes: purchase.allCodes,
          latestCode: purchase.verificationCode,
          attemptsUsed: purchase.codeCheckCount || 0,
          remainingSeconds: Math.floor(remainingTime),
          remainingMinutes: Math.floor(remainingTime / 60),
          isScanning: true,
        });
      }
    } else {
      // No code received from API
      const remainingTime = Math.max(0, 1500 - timeElapsed);
      
      // Increment check count for tracking (no limit)
      purchase.codeCheckCount = (purchase.codeCheckCount || 0) + 1;
      await purchase.save();
      
      return NextResponse.json({
        success: false,
        error: `Waiting for code... (Checking ${purchase.codeCheckCount} times)`,
        allCodes: purchase.allCodes,
        latestCode: purchase.verificationCode,
        attemptsUsed: purchase.codeCheckCount,
        remainingSeconds: Math.floor(remainingTime),
        remainingMinutes: Math.floor(remainingTime / 60),
        isScanning: true,
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
