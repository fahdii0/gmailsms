"use client";

import { useAuth } from "./AuthProvider";
import Link from "next/link";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href={user.role === "admin" ? "/admin" : "/dashboard"} className="text-xl font-bold text-indigo-600">
              GmailSMS
            </Link>
            {user.role === "admin" ? (
              <>
                <Link href="/admin" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/clients" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  Clients
                </Link>
                <Link href="/admin/settings" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  Settings
                </Link>
              </>
            ) : (
              <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 transition-colors">
                Dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.name}
              {user.role === "client" && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {user.balance} PKR
                </span>
              )}
              {user.role === "admin" && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
