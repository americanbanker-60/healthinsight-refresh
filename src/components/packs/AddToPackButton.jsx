import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AddToPackButton({ newsletterId, variant = "default", size = "sm" }) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: packs = [] } = useQuery({
    queryKey: ['learningPacks'],
    queryFn: () => base44.entities.LearningPack.list("pack_title"),
    initialData: [],
  });

  const addToPackMutation = useMutation({
    mutationFn: async ({ packId, newsletterId }) => {
      const pack = packs.find(p => p.id === packId);
      const currentPinned = pack.pinned_newsletter_ids || [];
      
      if (currentPinned.includes(newsletterId)) {
        // Remove from pack
        const updated = currentPinned.filter(id => id !== newsletterId);
        await base44.entities.LearningPack.update(packId, {
          pinned_newsletter_ids: updated
        });
        return { action: 'removed' };
      } else {
        // Add to pack
        await base44.entities.LearningPack.update(packId, {
          pinned_newsletter_ids: [...currentPinned, newsletterId]
        });
        return { action: 'added' };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learningPacks'] });
      toast.success(data.action === 'added' ? 'Added to pack' : 'Removed from pack');
    },
  });

  const handlePackClick = (packId) => {
    addToPackMutation.mutate({ packId, newsletterId });
  };

  const isInPack = (packId) => {
    const pack = packs.find(p => p.id === packId);
    return pack?.pinned_newsletter_ids?.includes(newsletterId);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setShowDialog(true);
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add to Pack
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Learning Pack</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {packs.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">No learning packs available</p>
            ) : (
              packs.map(pack => {
                const isPinned = isInPack(pack.id);
                return (
                  <button
                    key={pack.id}
                    onClick={() => handlePackClick(pack.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isPinned 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {pack.icon && <span className="text-lg">{pack.icon}</span>}
                          <h4 className="font-semibold text-sm text-slate-900">{pack.pack_title}</h4>
                        </div>
                        {pack.category && (
                          <Badge variant="outline" className="text-xs">
                            {pack.category}
                          </Badge>
                        )}
                      </div>
                      {isPinned && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}