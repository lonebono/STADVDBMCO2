"use client";

import { useState } from "react";

export default function TransactionForm() {
  // will have other states later
  const [isolation, setIsolation] = useState("read_committed");
  const [action, setAction] = useState("read");
  const [key, setKey] = useState("");

  const submit = async () => {
    console.log({
      isolation,
      action,
      key,
    });
  };

  return (
    <div className="p-4 bg-white rounded shadow flex flex-col gap-3 w-full max-w-xl">
      <h2 className="text-xl font-semibold">Run Transaction</h2>

      <label>Isolation Level:</label>
      <select
        className="border p-2 rounded"
        value={isolation}
        onChange={(e) => setIsolation(e.target.value)}
      >
        <option value="read_uncommitted">Read Uncommitted</option>
        <option value="read_committed">Read Committed</option>
        <option value="repeatable_read">Repeatable Read</option>
        <option value="serializable">Serializable</option>
      </select>

      <label>Action:</label>
      <select
        className="border p-2 rounded"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      >
        <option value="read">Read</option>
        <option value="write">Write</option>
      </select>

      <label>Key:</label>
      <input
        className="border p-2 rounded"
        placeholder="movie_id / actor_id / etc."
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />

      <button
        className="mt-4 p-2 bg-blue-600 text-white rounded"
        onClick={submit}
      >
        Submit
      </button>
    </div>
  );
}
