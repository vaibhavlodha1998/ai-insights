import type { CheckStatus } from "@/lib/api";

export function StatusRow({ name, status }: { name: string; status: CheckStatus }) {
  const ok = status === "ok";
  return (
    <li className="flex items-center justify-between border-b border-black/10 py-3 last:border-0 dark:border-white/10">
      <span className="font-mono text-sm">{name}</span>
      <span
        className={`flex items-center gap-2 text-sm font-medium ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
      >
        <span
          aria-hidden
          className={`size-2 rounded-full ${ok ? "bg-emerald-600" : "bg-red-600"}`}
        />
        {status}
      </span>
    </li>
  );
}
