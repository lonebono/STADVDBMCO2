// webapp/components/LogConsole.tsx

"use client";

interface LogConsoleProps {
  logs?: string[];
}

export default function LogConsole({ logs = [] }: LogConsoleProps) {
  return (
    <div className="p-4 bg-black text-green-400 rounded-lg h-full overflow-auto font-mono text-xs border border-gray-800 shadow-inner">
      {logs.length === 0 && (
        <div className="text-gray-700 italic flex items-center justify-center h-full">
          Waiting for system events...
        </div>
      )}

      {logs.map((log, index) => (
        <div
          key={index}
          className="mb-1.5 border-b border-gray-900 pb-1.5 flex gap-3 last:border-0"
        >
          <span className="text-gray-600 select-none w-6 text-right shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="break-all whitespace-pre-wrap">{log}</span>
        </div>
      ))}
    </div>
  );
}
