'use client';

import { useState, useEffect } from 'react';

type Server = 'server0' | 'server1' | 'server2';

export default function Page() {
  const [counts, setCounts] = useState<Record<Server, number | null>>({
    server0: null,
    server1: null,
    server2: null,
  });

  const fetchCounts = async () => {
    const promises = (['server0','server1','server2'] as Server[]).map(async s => {
      try {
        const res = await fetch(`/api/db?server=${s}`);
        const data = await res.json();
        return [s, data.rowCount] as const;
      } catch {
        return [s, null] as const;
      }
    });

    const results = await Promise.all(promises);

    const updatedCounts: Record<Server, number | null> = {
      server0: results.find(([s]) => s === 'server0')?.[1] ?? null,
      server1: results.find(([s]) => s === 'server1')?.[1] ?? null,
      server2: results.find(([s]) => s === 'server2')?.[1] ?? null,
    };

    setCounts(updatedCounts);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">title_basics Row Counts</h1>
      <ul>
        {(['server0','server1','server2'] as Server[]).map(s => (
          <li key={s}>
            {s}: {counts[s] === null ? 'Loading...' : counts[s] === -1 ? 'Error' : counts[s]}
          </li>
        ))}
      </ul>
      <button onClick={fetchCounts} className="mt-4 px-3 py-1 bg-blue-500 text-white rounded">
        Refresh Counts
      </button>
    </div>
  );
}
