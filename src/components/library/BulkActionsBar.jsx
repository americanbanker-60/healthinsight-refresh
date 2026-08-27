import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, ArchiveRestore, Trash2, Tag, X, Loader2 } from "lucide-react";
import { AdminOnlyButton } from "@/components/admin/AdminOnlyButton";

/**
 * Bulk action bar shown above the article list when the user is an admin.
 * Provides select-all, tag-with-theme, archive/unarchive, and delete actions.
 */
export default function BulkActionsBar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  onToggleSelectAll,
  onClear,
  topics,
  onTag,
  onArchive,
  onUnarchive,
  onDelete,
  showArchived,
  onToggleShowArchived,
  busy,
}) {
  const [tagTheme, setTagTheme] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-indigo-200 bg-indigo-50/40">
      <Checkbox
        checked={allVisibleSelected && visibleCount > 0}
        onCheckedChange={onToggleSelectAll}
        aria-label="Select all visible"
        className="ml-1"
      />

      {selectedCount > 0 ? (
        <>
          <Badge variant="secondary" className="text-xs">
            {selectedCount} selected
          </Badge>

          <AdminOnlyButton>
            <div className="flex items-center gap-1.5">
              <Select value={tagTheme} onValueChange={setTagTheme}>
                <SelectTrigger className="h-8 w-44 text-xs bg-white">
                  <Tag className="w-3 h-3 mr-1 text-indigo-500" />
                  <SelectValue placeholder="Tag theme…" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!tagTheme || busy}
                onClick={() => { onTag(tagTheme); setTagTheme(""); }}
              >
                Apply
              </Button>
            </div>
          </AdminOnlyButton>

          {showArchived ? (
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              disabled={busy}
              onClick={onUnarchive}
            >
              <ArchiveRestore className="w-3 h-3 mr-1" />
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              disabled={busy}
              onClick={onArchive}
            >
              <Archive className="w-3 h-3 mr-1" />
              Archive
            </Button>
          )}

          <AdminOnlyButton>
            {confirmDelete ? (
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">Delete {selectedCount}?</span>
                <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={busy} onClick={onDelete}>
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </AdminOnlyButton>

          <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={onClear}>
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </>
      ) : (
        <Button
          variant="ghost" size="sm"
          className="h-8 text-xs ml-auto"
          onClick={onToggleShowArchived}
        >
          {showArchived ? "View active" : "View archived"}
        </Button>
      )}

      {busy && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
    </div>
  );
}