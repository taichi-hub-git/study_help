import { TABS, type TabId } from "@/lib/types";

export default function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-900">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
