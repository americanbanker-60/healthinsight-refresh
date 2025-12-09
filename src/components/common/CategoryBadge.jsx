import React from "react";
import { Badge } from "@/components/ui/badge";

const categoryColors = {
  "Care Models": "bg-blue-100 text-blue-700 border-blue-200",
  "Payor Topics": "bg-green-100 text-green-700 border-green-200",
  "Technology": "bg-purple-100 text-purple-700 border-purple-200",
  "Provider Operations": "bg-orange-100 text-orange-700 border-orange-200",
  "Policy & Regulation": "bg-red-100 text-red-700 border-red-200",
  "Other": "bg-slate-100 text-slate-700 border-slate-200"
};

const sentimentColors = {
  positive: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-slate-100 text-slate-800 border-slate-200",
  negative: "bg-red-100 text-red-800 border-red-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

/**
 * Standardized badge with predefined color schemes
 */
export function CategoryBadge({ category, className = "" }) {
  return (
    <Badge className={`${categoryColors[category] || categoryColors.Other} ${className}`}>
      {category}
    </Badge>
  );
}

export function SentimentBadge({ sentiment, className = "" }) {
  if (!sentiment) return null;
  return (
    <Badge className={`${sentimentColors[sentiment]} border font-medium ${className}`}>
      {sentiment}
    </Badge>
  );
}