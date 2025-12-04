import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function SortControl({ sortOrder, onSortChange, label = "Date" }) {
  const toggleSort = () => {
    onSortChange(sortOrder === "newest" ? "oldest" : "newest");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleSort}
      className="gap-2"
    >
      {sortOrder === "newest" ? (
        <ArrowDown className="w-4 h-4" />
      ) : (
        <ArrowUp className="w-4 h-4" />
      )}
      {sortOrder === "newest" ? "Newest First" : "Oldest First"}
    </Button>
  );
}