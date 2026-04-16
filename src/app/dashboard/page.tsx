"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import CodeScanner from "@/components/CodeScanner";
import { Moon, Sun, MessageCircle } from "lucide-react";

interface Purchase {
  _id: string;
  mailId: string;
  email: string;
  price: number;
  status: "active" | "completed" | "cancelled" | "expired";
  verificationCode?: string;
  allCodes?: string[];
  createdAt: string;
}

interface ClientSettings {
  gmailPrice: number;
  whatsappNumber: string;
}

export default function ClientDashboard() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedPurchaseForScan, setSelectedPurchaseForScan] = useState<Purchase | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [settings, setSettings] = useState<ClientSettings>({ gmailPrice: 25, whatsappNumber: "" });
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const isDark = theme === "dark";

  const shellClass = isDark
    ? "min-h-screen bg-slate-950 text-slate-100"
    : "min-h-screen bg-gray-50 text-gray-900";

  const cardClass = isDark
    ? "bg-slate-900 border border-slate-800 shadow-lg shadow-black/20"
    : "bg-white border border-gray-200 shadow-sm";

  const subCardClass = isDark
    ? "bg-slate-900 border border-slate-800"
    : "bg-white border border-gray-200";

  const mutedTextClass = isDark ? "text-slate-400" : "text-gray-500";
  const softTextClass = isDark ? "text-slate-200" : "text-gray-900";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("dashboard-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

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

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/client/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          gmailPrice: Number(data.gmailPrice ?? 25),
          whatsappNumber: String(data.whatsappNumber ?? ""),
        });
      }
    } catch {
      console.error("Failed to fetch settings");
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
      fetchSettings();
    }
  }, [authLoading, user, token, router, fetchPurchases, fetchSettings]);

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
        
        // Auto-open scanner for the new purchase
        if (data.purchase) {
          setSelectedPurchaseForScan(data.purchase);
          setShowScanner(true);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to buy Gmail" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setBuyLoading(false);
    }
  };

  const handleCancelPurchase = async (purchaseId: string) => {
    try {
      const res = await fetch("/api/client/set-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId, status: "cancel" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Purchase cancelled successfully" });
        await fetchPurchases();
        setShowScanner(false);
        setSelectedPurchaseForScan(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to cancel" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
  };

  const handleCompletePurchase = async (purchaseId: string, codes: string[]) => {
    try {
      const res = await fetch("/api/client/set-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId, status: "finish" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ 
          type: "success", 
          text: `Purchase completed! Codes received: ${codes.join(", ")}` 
        });
        await fetchPurchases();
        setShowScanner(false);
        setSelectedPurchaseForScan(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to complete" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
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
    <div className={shellClass}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              isDark
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? "Light Theme" : "Dark Theme"}
          </button>
        </div>

        {/* Scanner Modal */}
        {showScanner && selectedPurchaseForScan && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowScanner(false)}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={() => setShowScanner(false)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <CodeScanner
                  purchaseId={selectedPurchaseForScan._id}
                  onComplete={(codes) => handleCompletePurchase(selectedPurchaseForScan._id, codes)}
                  onCancel={() => handleCancelPurchase(selectedPurchaseForScan._id)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Balance and Buy Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`${cardClass} rounded-xl p-6`}>
            <h2 className={`text-sm font-medium uppercase tracking-wide ${mutedTextClass}`}>Your Balance</h2>
            <p className={`mt-2 text-4xl font-bold ${softTextClass}`}>
              {user.balance} <span className="text-lg text-gray-500">PKR</span>
            </p>
            <div className={`mt-4 text-sm ${mutedTextClass}`}>
              <span className="font-medium">Note:</span> 1 Gmail = {settings.gmailPrice} PKR
            </div>
          </div>
          <div className={`${cardClass} rounded-xl p-6 flex flex-col justify-center`}>
            <button
              onClick={buyGmail}
              disabled={buyLoading}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
            >
              {buyLoading ? "Processing..." : "📧 Buy New Gmail Account"}
            </button>
            <p className="mt-2 text-center text-sm text-gray-500">
              Includes 25-minute auto-scanning for verification codes
            </p>
          </div>
        </div>

        <div className={`${cardClass} rounded-xl p-6 mb-8`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <MessageCircle size={22} />
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${softTextClass}`}>Deposit via WhatsApp</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                For deposit, contact admin on WhatsApp and send your transaction details.
              </p>
              {settings.whatsappNumber ? (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-xs font-bold">WA</span>
                  Contact Admin on WhatsApp
                </a>
              ) : (
                <div className={`mt-4 text-sm ${mutedTextClass}`}>
                  WhatsApp deposit number will appear here after admin configuration.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border animate-slideDown ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {message.type === "success" && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {message.type === "error" && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Purchases */}
        <div className={`${subCardClass} rounded-xl`}>
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className={`text-lg font-semibold ${softTextClass}`}>Purchase History</h2>
            <span className={`text-sm ${mutedTextClass}`}>
              {purchases.filter(p => p.status === "active").length} Active
            </span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No purchases yet. Click &ldquo;Buy New Gmail Account&rdquo; to get started!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <div key={purchase._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-900">
                          {purchase.email}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          purchase.status === "active" ? "bg-green-100 text-green-800 animate-pulse" :
                          purchase.status === "completed" ? "bg-blue-100 text-blue-800" :
                          purchase.status === "expired" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {purchase.status === "active" && "🟢 Active"}
                          {purchase.status === "completed" && "✅ Completed"}
                          {purchase.status === "expired" && "⏰ Expired"}
                          {purchase.status === "cancelled" && "❌ Cancelled"}
                        </span>
                        {purchase.allCodes && purchase.allCodes.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📨 {purchase.allCodes.length} Code{purchase.allCodes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-gray-500 space-y-1">
                        <div>Mail ID: {purchase.mailId} | Price: {purchase.price} PKR</div>
                        <div>Purchased: {new Date(purchase.createdAt).toLocaleString()}</div>
                      </div>
                      
                      {/* Display codes if available */}
                      {purchase.allCodes && purchase.allCodes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-gray-700">Received Codes:</p>
                          <div className="flex flex-wrap gap-2">
                            {purchase.allCodes.map((code, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="font-mono text-xs bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
                                  {code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(code);
                                    setMessage({ type: "success", text: "Code copied!" });
                                    setTimeout(() => setMessage(null), 2000);
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  📋
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {purchase.status === "active" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPurchaseForScan(purchase);
                            setShowScanner(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-sm"
                        >
                          🔍 Scan for Codes
                        </button>
                      </div>
                    )}
                    
                    {purchase.status === "completed" && purchase.allCodes && purchase.allCodes.length > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-green-600 font-medium">
                          ✓ Completed
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(purchase.allCodes!.join(", "));
                            setMessage({ type: "success", text: "All codes copied!" });
                            setTimeout(() => setMessage(null), 2000);
                          }}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Copy All Codes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className={`${isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-blue-50 border-blue-200 text-blue-800"} mt-8 border rounded-lg p-4`}>
          <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-slate-100" : "text-blue-900"}`}>📱 How It Works:</h3>
          <ul className={`text-sm space-y-1 ${isDark ? "text-slate-300" : "text-blue-800"}`}>
            <li>• Purchase a Gmail account - it will be automatically assigned to you</li>
            <li>• The panel now uses Gmail domain with FB service only</li>
            <li>• Click &quot;Scan for Codes&quot; to open the auto-scanning system</li>
            <li>• The system will automatically fetch SMS verification codes for 25 minutes</li>
            <li>• All received codes are saved and displayed in your purchase history</li>
            <li>• Click &quot;Complete&quot; when you have all the codes you need</li>
          </ul>
        </div>
      </main>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
