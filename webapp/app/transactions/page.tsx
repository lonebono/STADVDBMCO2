// webapp/app/transactions/page.tsx

"use client";

import { useState } from "react";
import Button from "../../components/Button";

const FRAGMENTATION_YEAR = 1919;

export default function TransactionsPage() {
  const [isolation, setIsolation] = useState("READ COMMITTED");
  const [sleepTime, setSleepTime] = useState(0);

  // default form data
  const [tconst, setTconst] = useState("tt9999999");
  const [title, setTitle] = useState("Test Movie");
  const [year, setYear] = useState(2025);
  const [runtime, setRuntime] = useState(120);

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // determine target node based on year
  const targetNode =
    year < FRAGMENTATION_YEAR ? "Server 1 (Node 2)" : "Server 2 (Node 3)";
  const targetColor =
    year < FRAGMENTATION_YEAR ? "text-yellow-400" : "text-cyan-400";

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    addLog(`   Sending Write Request...`);
    addLog(`   Target: ${targetNode} + Central`);
    addLog(`   Isolation: ${isolation}, Delay: ${sleepTime}ms`);

    try {
      const res = await fetch("/api/transaction", {
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
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        addLog(`SUCCESS: Transaction committed.`);
      } else if (data.status === "partial_failure") {
        addLog(`PARTIAL SUCCESS: One node failed. Queued for recovery.`);
      } else {
        addLog(`FAILURE: ${data.message}`);
      }

      if (data.results) {
        addLog(`   Details: ${JSON.stringify(data.results)}`);
      }
    } catch (err: any) {
      addLog(`NETWORK ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-900 text-white overflow-hidden">
      {/* LEFT COLUMN: Controls */}
      <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-800">
        <h1 className="text-2xl font-bold mb-6">Transaction Simulator</h1>

        {/* Configuration Card */}
        <div className="bg-gray-800 p-5 rounded-lg mb-6 border border-gray-700">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
            Step 3: Concurrency Control
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Isolation Level
              </label>
              <select
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                value={isolation}
                onChange={(e) => setIsolation(e.target.value)}
              >
                <option value="READ UNCOMMITTED">Read Uncommitted</option>
                <option value="READ COMMITTED">Read Committed</option>
                <option value="REPEATABLE READ">Repeatable Read</option>
                <option value="SERIALIZABLE">Serializable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Simulated Delay (ms)
              </label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                value={sleepTime}
                onChange={(e) => setSleepTime(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Data Entry Card */}
        <div className="bg-gray-800 p-5 rounded-lg mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              Data Payload
            </h2>
            <span
              className={`text-xs font-mono border border-gray-600 px-2 py-1 rounded bg-black ${targetColor}`}
            >
              Target: {targetNode}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                IMDB ID (tconst)
              </label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm font-mono"
                value={tconst}
                onChange={(e) => setTconst(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Movie Title
              </label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Start Year
                </label>
                <input
                  type="number"
                  className={`w-full bg-gray-900 border rounded p-2 text-sm font-bold ${
                    year < FRAGMENTATION_YEAR
                      ? "border-yellow-600 text-yellow-500"
                      : "border-cyan-600 text-cyan-500"
                  }`}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Runtime (min)
                </label>
                <input
                  type="number"
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                  value={runtime}
                  onChange={(e) => setRuntime(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full py-4 text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-transform"
        >
          {loading ? "Processing Transaction..." : "Execute Write Transaction"}
        </Button>
      </div>

      {/* RIGHT COLUMN: Logs */}
      <div className="w-full md:w-1/2 bg-black border-l border-gray-800 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Console Output
          </h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-gray-600 hover:text-white"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-auto font-mono text-xs space-y-2">
          {logs.length === 0 && (
            <div className="text-gray-700 mt-10 text-center italic">
              Waiting for transactions...
            </div>
          )}
          {logs.map((log, i) => (
            <div
              key={i}
              className="border-b border-gray-900 pb-1 break-words text-gray-300"
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
