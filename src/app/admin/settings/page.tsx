"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function AdminSettings() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [gmailPrice, setGmailPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGmailPrice(String(data.gmailPrice));
      }
    } catch {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    if (token) {
      fetchSettings();
    }
  }, [authLoading, user, token, router, fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gmailPrice: Number(gmailPrice) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Configuration</h2>

          {message && (
            <div className={`mb-4 p-3 rounded-lg border text-sm ${
              message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="text-gray-500">Loading settings...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="gmailPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Gmail Price (PKR)
                </label>
                <input
                  id="gmailPrice"
                  type="number"
                  value={gmailPrice}
                  onChange={(e) => setGmailPrice(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                  placeholder="Enter price in PKR"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This amount will be deducted from client balance for each Gmail purchase
                </p>
              </div>
              <button
                onClick={saveSettings}
                disabled={saving || !gmailPrice}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
