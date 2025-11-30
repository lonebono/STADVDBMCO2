// webapp/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";

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

  const fetchNodeInfo = async () => {
    const servers: Server[] = ["server0", "server1", "server2"];
    const promises = servers.map(async (s) => {
      try {
        const res = await fetch(`/api/db?server=${s}`);
        const data = await res.json();
        return [s, { rowCount: data.rowCount ?? 0, online: true }] as const;
      } catch {
        return [s, { rowCount: null, online: false }] as const;
      }
    });

    const results = await Promise.all(promises);
    const updatedNodes: Record<Server, NodeInfo> = Object.fromEntries(
      results
    ) as Record<Server, NodeInfo>;
    setNodes(updatedNodes);
    setLastRefresh(new Date()); // update last refresh
  };

  useEffect(() => {
    fetchNodeInfo();
    const interval = setInterval(fetchNodeInfo, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const totalRows = nodes.server0.rowCount ?? 1;

  const formatTime = (date: Date) =>
    `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

  return (
    <div className="flex flex-col gap-6 p-6 h-full bg-gray-900">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

      {/* Node Cards */}
      <div className="flex flex-wrap gap-4">
        {(Object.keys(nodes) as Server[]).map((s) => {
          const node = nodes[s];
          const partitionPercent = Math.round(
            ((node.rowCount ?? 0) / totalRows) * 100
          );

          return (
            <div
              key={s}
              className="flex-1 min-w-[220px] bg-gray-800 p-4 rounded shadow flex flex-col gap-3 text-white"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">{s.toUpperCase()}</h2>
                <div
                  className={`w-3 h-3 rounded-full ${
                    node.online ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>

              <p className="leading-relaxed">
                Row Count: {node.rowCount ?? "Loading..."}
              </p>

              {/* Partition bar */}
              <p className="mt-2">Partition:</p>
              <div className="w-full bg-gray-700 rounded h-3 mt-1">
                <div
                  className="bg-blue-500 h-3 rounded"
                  style={{ width: `${partitionPercent}%` }}
                />
              </div>
              <p className="text-sm">{partitionPercent}% of total rows</p>
            </div>
          );
        })}
      </div>

      {/* Refresh Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={fetchNodeInfo}
          className="mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded w-full max-w-xs"
        >
          Refresh Node Info
        </button>
        {lastRefresh && (
          <p className="text-white text-sm">
            Last Refresh: {formatTime(lastRefresh)}
          </p>
        )}
      </div>
    </div>
  );
}
