import React from "react";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS = {
  pe_firm: "PE Firm",
  health_system: "Health System",
  payor: "Payor",
  company: "Company",
  person: "Person",
};

const TYPE_COLORS = {
  pe_firm: "bg-indigo-100 text-indigo-700",
  health_system: "bg-blue-100 text-blue-700",
  payor: "bg-emerald-100 text-emerald-700",
  company: "bg-slate-100 text-slate-700",
  person: "bg-gray-100 text-gray-600",
};

/** Defensively normalize a key_players entry (legacy string or typed object). */
export function normalizeKeyPlayer(p) {
  if (!p) return null;
  if (typeof p === "string") return { name: p, type: "company" };
  if (p && typeof p === "object") {
    const type = TYPE_LABELS[p.type] ? p.type : "company";
    return { name: p.name || "", type };
  }
  return null;
}

export default function KeyPlayerBadge({ player }) {
  const np = normalizeKeyPlayer(player);
  if (!np?.name) return null;
  const label = TYPE_LABELS[np.type] || "Company";
  const color = TYPE_COLORS[np.type] || TYPE_COLORS.company;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-2 text-sm">
      <span className="text-slate-800">{np.name}</span>
      <Badge className={`text-[10px] leading-none px-1.5 py-0.5 border-0 ${color}`}>{label}</Badge>
    </span>
  );
}