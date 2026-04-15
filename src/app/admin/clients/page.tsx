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

export default function AdminClients() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchClients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
      }
    } catch {
      console.error("Failed to fetch clients");
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
      fetchClients();
    }
  }, [authLoading, user, token, router, fetchClients]);

  const addBalance = async () => {
    if (!selectedClient || !amount) return;
    setBalanceLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId: selectedClient, amount: Number(amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setAmount("");
        setSelectedClient(null);
        await fetchClients();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add balance" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setBalanceLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Client Management</h1>

        {/* Add Balance Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant Balance</h2>

          {message && (
            <div className={`mb-4 p-3 rounded-lg border text-sm ${
              message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedClient || ""}
              onChange={(e) => setSelectedClient(e.target.value || null)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name} ({client.email}) - {client.balance} PKR
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (PKR)"
              min="1"
              className="w-full sm:w-40 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
            <button
              onClick={addBalance}
              disabled={balanceLoading || !selectedClient || !amount}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {balanceLoading ? "Adding..." : "Add Balance"}
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Clients</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No clients registered yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{client.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{client.email}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">{client.balance} PKR</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
