// webapp/app/logs/page.tsx
"use client";

import LogConsole from "@/components/LogConsole";

export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full bg-gray-900">
      <h1 className="text-3xl font-bold text-white">System Logs</h1>
      <LogConsole />
    </div>
  );
}
