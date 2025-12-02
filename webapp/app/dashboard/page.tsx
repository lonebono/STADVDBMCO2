// webapp/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import RecoverButton from "../../components/RecoverButton";

type Server = "server0" | "server1" | "server2";

type NodeInfo = {
  rowCount: number | null;
  online: boolean;
};

export default function DashboardPage() {
  const [nodes, setNodes] = useState<Record<Server, NodeInfo>>({
    server0: { rowCount: null, online: true },
    server1: { rowCount: null, online: true },
    server2: { rowCount: null, online: true },
  });

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNodeInfo = async () => {
    setRefreshing(true);
    const servers: Server[] = ["server0", "server1", "server2"];

    const promises = servers.map(async (s) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`/api/db?server=${s}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Status not ok");

        const data = await res.json();
        const isOnline = data.rowCount !== undefined && data.rowCount !== null;
        return [s, { rowCount: data.rowCount ?? 0, online: isOnline }] as const;
      } catch (e) {
        return [s, { rowCount: null, online: false }] as const;
      }
    });

    const results = await Promise.all(promises);
    const updatedNodes = Object.fromEntries(results) as Record<
      Server,
      NodeInfo
    >;
    setNodes(updatedNodes);
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNodeInfo();
    const interval = setInterval(fetchNodeInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalRows = nodes.server0.rowCount ?? 1;

  const formatTime = (date: Date) =>
    `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

  return (
    <div className="flex flex-col gap-6 p-8 h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time distributed node monitoring
          </p>
        </div>
        <RecoverButton />
      </div>

      {/* Node Cards */}
      <div className="flex flex-wrap gap-4">
        {(Object.keys(nodes) as Server[]).map((s) => {
          const node = nodes[s];
          const partitionPercent =
            totalRows > 0
              ? Math.round(((node.rowCount ?? 0) / totalRows) * 100)
              : 0;

          // Card Styles based on Status
          const statusColors = node.online
            ? "bg-gray-800 border-gray-700 hover:border-gray-500"
            : "bg-red-950/30 border-red-800 hover:border-red-600";

          return (
            <Link
              key={s}
              href={`/records?server=${s}`}
              className="flex-1 min-w-[220px] group relative block transition-transform hover:scale-[1.02]"
            >
              <div
                className={`p-6 rounded-xl border shadow-xl flex flex-col gap-4 h-full transition-colors ${statusColors}`}
              >
                {/* Hover Arrow Indicator */}
                <div className="absolute top-4 right-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  ↗
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        node.online
                          ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                          : "bg-red-500 animate-pulse"
                      }`}
                    />
                    <h2 className="font-bold text-lg tracking-wide">
                      {s.toUpperCase()}
                    </h2>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                      node.online
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/40 text-red-400"
                    }`}
                  >
                    {node.online ? "Connected" : "Unreachable"}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-gray-400 text-xs uppercase font-semibold">
                    Row Count
                  </p>
                  <p className="text-3xl font-mono font-light tracking-tighter">
                    {node.rowCount !== null
                      ? node.rowCount.toLocaleString()
                      : "---"}
                  </p>
                </div>

                {/* Partition Visual */}
                <div className="pt-2 mt-auto">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Usage</span>
                    <span>{partitionPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-900/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        node.online ? "bg-blue-500" : "bg-gray-700"
                      }`}
                      style={{ width: `${partitionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-6 flex justify-between items-center text-xs text-gray-500 border-t border-gray-800">
        <p>Fragmentation Year: 1919 (Server 1 &lt; 1919, Server 2 ≥ 1919)</p>
        <div className="flex items-center gap-2">
          <span>
            {lastRefresh
              ? `Last Sync: ${lastRefresh.toLocaleTimeString()}`
              : "Syncing..."}
          </span>
          <button
            onClick={fetchNodeInfo}
            disabled={refreshing}
            className="hover:text-white disabled:opacity-50"
          >
            {refreshing ? "..." : "↻"}
          </button>
        </div>
      </div>
    </div>
  );
}
