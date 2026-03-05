"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const token = getAuthToken();
      if (token) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  if (!mounted) {
    return (
      <div className="card card-pad text-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card card-pad text-center">
      <div className="text-muted">Redirecting...</div>
    </div>
  );
}
