// webapp/app/transactions/page.tsx
"use client";

import { useState } from "react";

export default function TransactionsPage() {
  const [isolation, setIsolation] = useState("read_committed");
  const [action, setAction] = useState("read");
  const [key, setKey] = useState("");

  const submit = async () => {
    console.log({ isolation, action, key });
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full bg-gray-900">
      <h1 className="text-3xl font-bold text-white">Transactions</h1>

      <div className="flex flex-col gap-4 max-w-lg">
        <label className="font-medium text-white">Isolation Level:</label>
        <select
          className="border border-gray-600 p-2 rounded bg-gray-800 text-white"
          value={isolation}
          onChange={(e) => setIsolation(e.target.value)}
        >
          <option value="read_uncommitted">Read Uncommitted</option>
          <option value="read_committed">Read Committed</option>
          <option value="repeatable_read">Repeatable Read</option>
          <option value="serializable">Serializable</option>
        </select>

        <label className="font-medium text-white">Action:</label>
        <select
          className="border border-gray-600 p-2 rounded bg-gray-800 text-white"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="read">Read</option>
          <option value="write">Write</option>
        </select>

        <label className="font-medium text-white">Key:</label>
        <input
          className="border border-gray-600 p-2 rounded bg-gray-800 text-white"
          placeholder="movie_id / actor_id / etc."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <button
          className="mt-4 p-2 bg-blue-600 rounded hover:bg-blue-700 text-white font-semibold"
          onClick={submit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
