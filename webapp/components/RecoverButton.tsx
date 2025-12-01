// webapp/components/RecoverButton.tsx

"use client";

import { useState } from "react";
import Button from "@/components/Button";

export default function RecoverButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handleRecover = async () => {
    setLoading(true);
    setStatus("Scanning network...");

    try {
      const res = await fetch("/api/recover", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(`✅ ${data.message}`);
      } else {
        setStatus(`❌ ${data.message || data.error || "Failed"}`);
      }
    } catch (err) {
      setStatus("❌ Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex-1">
        <h3 className="text-sm font-bold text-gray-200">
          Global Recovery Protocol
        </h3>
        <p className="text-xs text-gray-400">
          Scan local logs & push missed transactions.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <span
            className={`text-xs font-mono px-2 py-1 rounded ${
              status.startsWith("❌")
                ? "bg-red-900/50 text-red-300"
                : "bg-green-900/50 text-green-300"
            }`}
          >
            {status}
          </span>
        )}

        <Button
          onClick={handleRecover}
          className={`text-xs uppercase font-bold tracking-wider ${
            loading
              ? "opacity-50 cursor-wait bg-gray-600"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Syncing..." : "Run Recovery"}
        </Button>
      </div>
    </div>
  );
}
