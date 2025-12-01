"use client";

import { useState } from "react";
import LogConsole from "@/components/LogConsole";
import Button from "@/components/Button";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runRecovery = async () => {
    setIsLoading(true);
    setLogs(prev => ["Initiating Recovery Sync...", ...prev]);

    try {
        const res = await fetch('/api/recover', { method: 'POST' });
        const data = await res.json();
        
        setLogs(prev => [
            `--- SYNC REPORT ---`,
            `Status: ${data.message || 'Complete'}`,
            `Recovered Transactions: ${data.recovered}`,
            `Still Failing/Pending: ${data.remaining}`,
            `-------------------`,
            ...prev
        ]);
    } catch (err: any) {
        setLogs(prev => [`Error during sync: ${err.message}`, ...prev]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full bg-gray-900 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Global Failure Recovery</h1>
            <p className="text-gray-400 text-sm mt-1">Rubric Step 4: Replay missed transactions</p>
          </div>
          
          <Button 
            onClick={runRecovery} 
            className={`flex items-center gap-2 px-6 py-3 ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 transition-transform"}`}
          >
             <span className={isLoading ? "animate-spin" : ""}>🔄</span> 
             {isLoading ? "Syncing..." : "Replay & Sync Logs"}
          </Button>
      </div>
      <div className="flex-grow min-h-[400px]">
        <LogConsole logs={logs} />
      </div>
    </div>
  );
}
