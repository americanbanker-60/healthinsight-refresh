import React from "react";
import { Layers, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Sidebar filter listing canonical themes with article counts.
 * - `themes`: [{ name, count }]
 * - `selected`: theme name or "all"
 * - `onSelect(name)`
 */
export default function ThemeFilterSidebar({ themes, selected, onSelect }) {
  return (
    <div className="w-full lg:w-56 shrink-0 border border-slate-200 rounded-xl bg-white/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <Layers className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-800">Themes</h3>
        <span className="ml-auto text-[11px] text-slate-400">{themes.length}</span>
      </div>
      <ScrollArea className="h-[420px] px-2 py-2">
        <button
          onClick={() => onSelect("all")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors mb-1",
            selected === "all"
              ? "bg-indigo-100 text-indigo-800 font-medium"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <span>All Themes</span>
        </button>
        {themes.length === 0 ? (
          <p className="px-3 py-4 text-xs text-slate-400">No themes found in your articles.</p>
        ) : (
          <div className="space-y-0.5">
            {themes.map((t) => {
              const active = selected === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => onSelect(active ? "all" : t.name)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    active
                      ? "bg-indigo-100 text-indigo-800 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {active && <Check className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{t.name}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] px-1.5 py-0.5 rounded-md tabular-nums",
                      active ? "bg-indigo-200 text-indigo-800" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}