"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Navigation</h2>

      <Link href="/dashboard" className="hover:text-blue-300">
        Dashboard
      </Link>

      <Link href="/logs" className="hover:text-blue-300">
        Logs
      </Link>
    </div>
  );
}
