import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderPlus } from "lucide-react";
import { toast } from "sonner";

export default function AddToPackButton({ newsletterId, variant = "default" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("existing");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [newPackTitle, setNewPackTitle] = useState("");
  const [newPackDescription, setNewPackDescription] = useState("");
  const [note, setNote] = useState("");
  
  const queryClient = useQueryClient();

  const { data: customPacks = [] } = useQuery({
    queryKey: ['userCustomPacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.UserCustomPack.filter({ created_by: user.email }, "-created_date");
    },
    initialData: [],
    enabled: open,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ packId, itemId, note }) => {
      const existing = await base44.entities.UserCustomPackItem.filter({
        custom_pack_id: packId,
        item_id: itemId
      });
      
      if (existing.length > 0) {
        throw new Error("Item already in pack");
      }

      const items = await base44.entities.UserCustomPackItem.filter({ custom_pack_id: packId });
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index || 0)) : 0;

      return await base44.entities.UserCustomPackItem.create({
        custom_pack_id: packId,
        item_id: itemId,
        order_index: maxOrder + 1,
        note: note || ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPacks'] });
      queryClient.invalidateQueries({ queryKey: ['userCustomPackItems'] });
      toast.success("Added to pack!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add item");
    }
  });

  const createPackMutation = useMutation({
    mutationFn: async ({ title, description }) => {
      return await base44.entities.UserCustomPack.create({
        pack_title: title,
        description: description || ""
      });
    },
    onSuccess: (newPack) => {
      queryClient.invalidateQueries({ queryKey: ['userCustomPacks'] });
      addItemMutation.mutate({
        packId: newPack.id,
        itemId: newsletterId,
        note
      });
    },
  });

  const handleSubmit = () => {
    if (mode === "existing") {
      if (!selectedPackId) {
        toast.error("Please select a pack");
        return;
      }
      addItemMutation.mutate({
        packId: selectedPackId,
        itemId: newsletterId,
        note
      });
    } else {
      if (!newPackTitle.trim()) {
        toast.error("Please enter a pack title");
        return;
      }
      createPackMutation.mutate({
        title: newPackTitle,
        description: newPackDescription
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setMode("existing");
    setSelectedPackId("");
    setNewPackTitle("");
    setNewPackDescription("");
    setNote("");
  };

  return (
    <>
      <Button
        variant={variant === "icon" ? "ghost" : "outline"}
        size={variant === "icon" ? "icon" : "sm"}
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        {variant !== "icon" && <span className="ml-2">Add to Pack</span>}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Custom Pack</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={mode} onValueChange={setMode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing">Add to existing pack</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">Create new pack</Label>
              </div>
            </RadioGroup>

            {mode === "existing" ? (
              <div>
                <Label>Select Pack</Label>
                {customPacks.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-2">No custom packs yet. Create one below.</p>
                ) : (
                  <RadioGroup value={selectedPackId} onValueChange={setSelectedPackId} className="mt-2">
                    {customPacks.map(pack => (
                      <div key={pack.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={pack.id} id={pack.id} />
                        <Label htmlFor={pack.id} className="cursor-pointer">
                          {pack.pack_title}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Pack Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., MA Market Prep Packet"
                    value={newPackTitle}
                    onChange={(e) => setNewPackTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What's this pack about?"
                    value={newPackDescription}
                    onChange={(e) => setNewPackDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about why this item is important..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={addItemMutation.isPending || createPackMutation.isPending}
            >
              {mode === "new" ? (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create & Add
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Pack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}