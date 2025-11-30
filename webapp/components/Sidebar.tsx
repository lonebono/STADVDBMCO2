// webapp/components/Sidebar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/logs", label: "Logs" },
  ];

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-screen p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-white">MCO2 DDB</h2>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`text-left block p-2 rounded hover:bg-gray-700 text-white ${
                isActive ? "bg-gray-700 font-semibold" : ""
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
