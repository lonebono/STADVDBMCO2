// webapp/app/records/page.tsx

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function RecordsContent() {
  const searchParams = useSearchParams();
  const server = searchParams.get("server") || "server0";

  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced Search or simple effect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/records?server=${server}&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setRecords(data.records || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Small debounce to prevent spamming while typing
    const timeoutId = setTimeout(fetchData, 300);
    return () => clearTimeout(timeoutId);
  }, [server, query]);

  return (
    <div className="p-8 h-full flex flex-col bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Node Explorer</h1>
          <p className="text-gray-400 text-sm">
            Viewing Data on{" "}
            <span className="font-mono text-blue-400 uppercase">{server}</span>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by ID, Title, Year, or Runtime..."
        className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg mb-6 focus:ring-2 focus:ring-blue-600 outline-none text-lg placeholder-gray-500"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-800 rounded-lg border border-gray-700 shadow-inner">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-900 sticky top-0 shadow-md">
            <tr>
              <th className="p-4 font-semibold text-gray-400 border-b border-gray-700">
                ID
              </th>
              <th className="p-4 font-semibold text-gray-400 border-b border-gray-700">
                Title
              </th>
              <th className="p-4 font-semibold text-gray-400 border-b border-gray-700">
                Type
              </th>
              <th className="p-4 font-semibold text-gray-400 border-b border-gray-700">
                Year
              </th>
              <th className="p-4 font-semibold text-gray-400 border-b border-gray-700">
                Runtime
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Scanning Database...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No records found matching "{query}"
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr
                  key={r.tconst}
                  className="hover:bg-gray-700/50 transition-colors"
                >
                  <td className="p-4 font-mono text-xs text-blue-300">
                    {r.tconst}
                  </td>
                  <td className="p-4 font-medium text-white">
                    {r.primaryTitle}
                  </td>
                  <td className="p-4 text-sm text-gray-400">{r.titleType}</td>
                  <td className="p-4 text-sm font-mono text-yellow-500">
                    {r.startYear}
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {r.runtimeMinutes} min
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-2 text-right">
        Showing top 50 matches
      </p>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <RecordsContent />
    </Suspense>
  );
}
