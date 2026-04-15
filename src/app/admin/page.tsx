"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

interface Client {
  _id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: string;
}

interface Purchase {
  _id: string;
  userId: { name: string; email: string } | null;
  mailId: string;
  email: string;
  price: number;
  status: string;
  verificationCode?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [clientsRes, purchasesRes] = await Promise.all([
        fetch("/api/admin/clients", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/purchases", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients);
      }
      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(data.purchases);
      }
    } catch {
      console.error("Failed to fetch data");
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
      fetchData();
    }
  }, [authLoading, user, token, router, fetchData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const totalBalance = clients.reduce((sum, c) => sum + c.balance, 0);
  const totalPurchases = purchases.length;
  const activePurchases = purchases.filter((p) => p.status === "active").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Clients</p>
            <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Balance (All Clients)</p>
            <p className="text-3xl font-bold text-gray-900">{totalBalance} <span className="text-sm text-gray-500">PKR</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Purchases</p>
            <p className="text-3xl font-bold text-gray-900">{totalPurchases}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Active Purchases</p>
            <p className="text-3xl font-bold text-green-600">{activePurchases}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading data...</div>
        ) : (
          <>
            {/* Recent Purchases */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
              </div>
              {purchases.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No purchases yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gmail</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.slice(0, 10).map((p) => (
                        <tr key={p._id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {p.userId ? p.userId.name : "Unknown"}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-700">{p.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{p.price} PKR</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.status === "active" ? "bg-green-100 text-green-800" :
                              p.status === "completed" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
