// webapp/components/Button.tsx
"use client";

export default function Button({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded ${className}`}
    >
      {children}
    </button>
  );
}
