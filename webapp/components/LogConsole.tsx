// webapp/components/LogConsole.tsx

"use client";

interface LogConsoleProps {
  logs?: string[];
}

export default function LogConsole({ logs = [] }: LogConsoleProps) {
  return (
    <div className="p-4 bg-black text-green-400 rounded h-full overflow-auto font-mono text-sm border border-gray-700 shadow-inner">
      {logs.length === 0 && (
        <div className="text-gray-600 italic flex items-center justify-center h-full">
          No logs generated yet...
        </div>
      )}

      {logs.map((log, index) => (
        <div
          key={index}
          className="mb-1 border-b border-gray-900 pb-1 flex gap-2"
        >
          <span className="text-gray-600 select-none">
            [{String(index + 1).padStart(2, "0")}]
          </span>
          <span className="break-all">{log}</span>
        </div>
      ))}
    </div>
  );
}
