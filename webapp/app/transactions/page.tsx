"use client";

import { useState } from "react";
import Button from "@/components/Button";

const FRAGMENTATION_YEAR = 1919;

export default function TransactionsPage() {
  const [actionType, setActionType] = useState<"INSERT" | "DELETE" | "READ">(
    "INSERT"
  ); //add read
  const [isolation, setIsolation] = useState("READ COMMITTED");
  const [sleepTime, setSleepTime] = useState(0);

  // form data
  const [tconst, setTconst] = useState("tt9999999");
  const [titleType, setTitleType] = useState("movie");
  const [title, setTitle] = useState("Test Movie");
  const [year, setYear] = useState(2025);
  const [runtime, setRuntime] = useState(120);

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // helper to determine target visually
  const targetNode =
    actionType === "DELETE"
      ? "ALL NODES (Broadcast)"
      : year < FRAGMENTATION_YEAR
      ? "Server 1 (Node 2)"
      : "Server 2 (Node 3)";

  const targetColor =
    actionType === "DELETE"
      ? "text-red-400 border-red-900 bg-red-900/20"
      : year < FRAGMENTATION_YEAR
      ? "text-yellow-400 border-yellow-900 bg-yellow-900/20"
      : "text-cyan-400 border-cyan-900 bg-cyan-900/20";

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    addLog(`   Action: ${actionType}`);

    try {
      let res;

      // READ
      if (actionType === "READ") {
        addLog(`   Sending READ Request...`);
        const params = new URLSearchParams({
          tconst,
          isolationLevel: isolation,
          targetNode: "central",
        });

        res = await fetch(`/api/transaction?${params}`, { method: "GET" });
      } else {
        // WRITE/DELETE
        const method = actionType === "DELETE" ? "DELETE" : "POST";
        addLog(`   Sending ${method} Request...`);
        addLog(`   Target: ${targetNode}`);
        addLog(`   Isolation: ${isolation}, Delay: ${sleepTime}ms`);

        const payload: any = {
          tconst,
          isolationLevel: isolation,
          sleepTime: Number(sleepTime),
        };

        if (actionType === "INSERT") {
          payload.titleType = titleType;
          payload.primaryTitle = title;
          payload.startYear = Number(year);
          payload.runtimeMinutes = Number(runtime);
        }

        res = await fetch("/api/transaction", {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (data.status === "success") {
        addLog(`SUCCESS: Operation completed.`);
        if (data.data) {
          addLog(`   READ RESULT: ${JSON.stringify(data.data, null, 2)}`);
        }
      } else if (data.status === "partial_failure") {
        addLog(`PARTIAL SUCCESS: One node failed. Queued for recovery.`);
      } else {
        addLog(`FAILURE: ${data.message || data.error || "Unknown error"}`);
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

        {/* Action Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActionType("INSERT")}
            className={`flex-1 py-3 rounded font-bold text-[10px] sm:text-xs md:text-sm border transition-all ${
              actionType === "INSERT"
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
            }`}
          >
            WRITE
          </button>
          <button
            onClick={() => setActionType("READ")}
            className={`flex-1 py-3 rounded font-bold text-[10px] sm:text-xs md:text-sm border transition-all ${
              actionType === "READ"
                ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/50"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
            }`}
          >
            READ
          </button>
          <button
            onClick={() => setActionType("DELETE")}
            className={`flex-1 py-3 rounded font-bold text-[10px] sm:text-xs md:text-sm border transition-all ${
              actionType === "DELETE"
                ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
            }`}
          >
            DELETE
          </button>
        </div>

        {/* Config Card */}
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

            <div
              className={
                actionType === "READ" ? "opacity-50 pointer-events-none" : ""
              }
            >
              <label className="block text-xs text-gray-500 mb-1">
                Simulated Delay (ms)
              </label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-blue-500 outline-none"
                value={sleepTime}
                onChange={(e) => setSleepTime(Number(e.target.value))}
                placeholder={actionType === "READ" ? "N/A" : "0"}
              />
            </div>
          </div>
        </div>

        {/* Data Entry */}
        <div className="bg-gray-800 p-5 rounded-lg mb-6 border border-gray-700 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              Data Payload
            </h2>
            {actionType !== "READ" && (
              <span
                className={`text-[10px] font-mono border px-2 py-1 rounded ${targetColor}`}
              >
                {targetNode}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                IMDB ID (tconst)
              </label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm font-mono text-blue-300"
                value={tconst}
                onChange={(e) => setTconst(e.target.value)}
                placeholder="e.g. tt1234567"
              />
            </div>

            {/* Conditional Inputs: Hide these if Reading or Deleting */}
            {actionType === "INSERT" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Title Type
                    </label>
                    <input
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                      value={titleType}
                      onChange={(e) => setTitleType(e.target.value)}
                      placeholder="movie"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Primary Title
                    </label>
                    <input
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
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
            )}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          className={`w-full py-4 text-lg shadow-xl active:scale-95 transition-transform ${
            actionType === "DELETE"
              ? "bg-red-600 hover:bg-red-700 shadow-red-900/20"
              : actionType === "READ"
              ? "bg-green-600 hover:bg-green-700 shadow-green-900/20"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
          }`}
        >
          {loading
            ? "Processing..."
            : actionType === "DELETE"
            ? "EXECUTE DELETE"
            : actionType === "READ"
            ? "EXECUTE READ"
            : "EXECUTE WRITE"}
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
              className="border-b border-gray-900/50 pb-1 break-words text-gray-300"
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
