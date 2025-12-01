// webapp/app/transactions/page.tsx

"use client";

import { useState } from "react";
import Button from "@/components/Button";

export default function TransactionsPage() {
  const [isolation, setIsolation] = useState("READ COMMITTED");
  const [action, setAction] = useState("write");
  const [sleepTime, setSleepTime] = useState(0);

  const [tconst, setTconst] = useState("tt9999999");
  const [title, setTitle] = useState("Test Movie");
  const [year, setYear] = useState(2025);
  const [runtime, setRuntime] = useState(120);
  4;
  const [statusLogs, setStatusLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setStatusLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const submit = async () => {
    addLog(`Sending ${action.toUpperCase()} request...`);

    try {
      let res;
      if (action === "read") {
        const params = new URLSearchParams({
          tconst,
          isolationLevel: isolation,
          targetNode: "central",
        });
        res = await fetch(`/api/transaction/read?${params}`);
      } else {
        res = await fetch("/api/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tconst,
            titleType: "movie",
            primaryTitle: title,
            startYear: Number(year),
            runtimeMinutes: Number(runtime),
            isolationLevel: isolation,
            sleepTime: Number(sleepTime),
            targetNode: "central",
          }),
        });
      }

      const data = await res.json();
      addLog(`Response: ${JSON.stringify(data)}`);
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full bg-gray-900 overflow-y-auto">
      <h1 className="text-3xl font-bold text-white">Transaction Simulator</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* left column (controls) */}
        <div className="flex flex-col gap-4">
          {/* config */}
          <div className="bg-gray-800 p-4 rounded border border-gray-700">
            <h2 className="text-gray-400 font-bold mb-4 uppercase text-sm tracking-wider">
              Step 3: Concurrency Config
            </h2>

            <label className="text-white text-sm block mb-1">
              Isolation Level
            </label>
            <select
              className="w-full border border-gray-600 p-2 rounded bg-gray-900 text-white mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={isolation}
              onChange={(e) => setIsolation(e.target.value)}
            >
              <option value="READ UNCOMMITTED">
                Read Uncommitted (Allows Dirty Reads)
              </option>
              <option value="READ COMMITTED">Read Committed (Standard)</option>
              <option value="REPEATABLE READ">Repeatable Read</option>
              <option value="SERIALIZABLE">
                Serializable (Strict Locking)
              </option>
            </select>

            <label className="text-white text-sm block mb-1">Action Type</label>
            <select
              className="w-full border border-gray-600 p-2 rounded bg-gray-900 text-white mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="read">Read Data (Check consistency)</option>
              <option value="write">Write Data (Trigger locks)</option>
            </select>

            <label className="text-white text-sm block mb-1">
              Artificial Delay (ms)
            </label>
            <input
              type="number"
              className="w-full border border-gray-600 p-2 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={sleepTime}
              onChange={(e) => setSleepTime(Number(e.target.value))}
              placeholder="e.g. 5000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to <strong>5000</strong> to test locking behavior during
              concurrency.
            </p>
          </div>

          {/* data payload */}
          <div className="bg-gray-800 p-4 rounded border border-gray-700">
            <h2 className="text-gray-400 font-bold mb-4 uppercase text-sm tracking-wider">
              Data Payload
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">ID (tconst)</label>
                <input
                  className="w-full p-2 bg-gray-900 text-white border border-gray-600 rounded"
                  value={tconst}
                  onChange={(e) => setTconst(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Primary Title</label>
                <input
                  className="w-full p-2 bg-gray-900 text-white border border-gray-600 rounded"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-xs text-gray-400">Start Year</label>
                  <input
                    type="number"
                    className="w-full p-2 bg-gray-900 text-white border border-gray-600 rounded"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>
                <div className="w-1/2">
                  <label className="text-xs text-gray-400">Runtime (min)</label>
                  <input
                    type="number"
                    className="w-full p-2 bg-gray-900 text-white border border-gray-600 rounded"
                    value={runtime}
                    onChange={(e) => setRuntime(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={submit}
            className="w-full py-4 font-bold text-lg shadow-lg shadow-blue-900/50 transition-transform active:scale-95"
          >
            EXECUTE TRANSACTION
          </Button>
        </div>

        {/* right column logs */}
        <div className="flex flex-col h-full">
          <div className="bg-black p-4 rounded border border-gray-700 h-[600px] overflow-auto font-mono text-sm text-green-400 shadow-inner">
            <div className="mb-2 border-b border-gray-800 pb-2 text-gray-500 font-bold">
              Transaction Console Output
            </div>
            {statusLogs.length === 0 && (
              <span className="text-gray-700 animate-pulse">
                Waiting for commands...
              </span>
            )}
            {statusLogs.map((log, i) => (
              <div
                key={i}
                className="mb-2 border-b border-gray-900/50 pb-1 break-words whitespace-pre-wrap"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
