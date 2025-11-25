"use client";

import { useState } from "react";

export default function LogConsole() {
  const [logs] = useState<string[]>(["System initialized..."]);

  return (
    <div className="p-4 bg-black text-green-400 rounded h-full overflow-auto">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}
