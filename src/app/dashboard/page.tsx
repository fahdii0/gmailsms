"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

interface Purchase {
  _id: string;
  mailId: string;
  email: string;
  price: number;
  status: "active" | "completed" | "cancelled";
  verificationCode?: string;
  createdAt: string;
}

export default function ClientDashboard() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPurchases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/client/purchases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPurchases(data.purchases);
      }
    } catch {
      console.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role === "admin") {
      router.push("/admin");
      return;
    }
    if (token) {
      fetchPurchases();
    }
  }, [authLoading, user, token, router, fetchPurchases]);

  const buyGmail = async () => {
    setBuyLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/client/buy-gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Gmail purchased: ${data.purchase.email}` });
        await refreshUser();
        await fetchPurchases();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to buy Gmail" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setBuyLoading(false);
    }
  };

  const getCode = async (purchaseId: string) => {
    setCodeLoading(purchaseId);
    setMessage(null);
    try {
      const res = await fetch("/api/client/get-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId }),
      });
      const data = await res.json();
      if (data.code) {
        setMessage({ type: "success", text: `Verification code: ${data.code}` });
        await fetchPurchases();
      } else {
        setMessage({ type: "error", text: data.error || "No code available yet. Try again." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setCodeLoading(null);
    }
  };

  const updateStatus = async (purchaseId: string, status: "cancel" | "finish") => {
    setStatusLoading(purchaseId);
    setMessage(null);
    try {
      const res = await fetch("/api/client/set-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        await fetchPurchases();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update status" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setStatusLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance and Buy Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Your Balance</h2>
            <p className="mt-2 text-4xl font-bold text-gray-900">{user.balance} <span className="text-lg text-gray-500">PKR</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
            <button
              onClick={buyGmail}
              disabled={buyLoading}
              className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {buyLoading ? "Purchasing..." : "📧 Buy Gmail"}
            </button>
            <p className="mt-2 text-center text-sm text-gray-500">
              Deducts from your balance automatically
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.text}
          </div>
        )}

        {/* Purchases */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Purchase History</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No purchases yet. Click &quot;Buy Gmail&quot; to get started!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <div key={purchase._id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-900">
                          {purchase.email}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          purchase.status === "active" ? "bg-green-100 text-green-800" :
                          purchase.status === "completed" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {purchase.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Mail ID: {purchase.mailId} | Price: {purchase.price} PKR |{" "}
                        {new Date(purchase.createdAt).toLocaleString()}
                      </div>
                      {purchase.verificationCode && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <span className="font-medium text-yellow-800">Code:</span>{" "}
                          <span className="font-mono text-yellow-900">{purchase.verificationCode}</span>
                        </div>
                      )}
                    </div>
                    {purchase.status === "active" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => getCode(purchase._id)}
                          disabled={codeLoading === purchase._id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {codeLoading === purchase._id ? "Loading..." : "Get Code"}
                        </button>
                        <button
                          onClick={() => updateStatus(purchase._id, "finish")}
                          disabled={statusLoading === purchase._id}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => updateStatus(purchase._id, "cancel")}
                          disabled={statusLoading === purchase._id}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
