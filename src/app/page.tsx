"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
    } else if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2">GmailSMS</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
