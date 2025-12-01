// webapp/app/logs/page.tsx

"use client";

import { useState, useEffect } from "react";
import LogConsole from "@/components/LogConsole";
import RecoverButton from "@/components/RecoverButton";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>(["Initializing log stream..."]);

  // fetcg real logs from the DB
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();

      if (data.logs && Array.isArray(data.logs)) {
        if (data.logs.length === 0) {
          setLogs(["No recovery logs found in local database."]);
          return;
        }

        // format logs for display
        const formattedLogs = data.logs.map((row: any) => {
          const time = new Date(row.timestamp).toLocaleTimeString();
          return `[${time}] [${row.status}] Target: ${row.failed_node} | ID: ${row.id}`;
        });

        setLogs(formattedLogs);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  // check for updates every 3 seconds
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-6 gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">System Log</h1>
          <p className="text-gray-400 text-sm mt-1">
            Live view of the local <code>recovery_log</code> table.
          </p>
        </div>
      </div>

      {/* Recovery Action Area */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold mb-1">Recovery Controls</h2>
          <p className="text-sm text-gray-400">
            If you see PENDING logs below, the target node might be back online.
            Run recovery to push data.
          </p>
        </div>
        <RecoverButton />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            Database Stream ({logs.length} entries)
          </h2>
          <button
            onClick={fetchLogs}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Refresh Now
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <LogConsole logs={logs} />
        </div>
      </div>
    </div>
  );
}
