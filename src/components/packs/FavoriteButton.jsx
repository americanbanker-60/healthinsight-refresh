import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function FavoriteButton({ packId, variant = "default" }) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoritePacks'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.FavoritePack.filter(
        { created_by: user.email },
        "-favorited_at"
      );
    },
    initialData: [],
  });

  const isFavorited = favorites.some(fav => fav.pack_id === packId);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        const favorite = favorites.find(fav => fav.pack_id === packId);
        await base44.entities.FavoritePack.delete(favorite.id);
      } else {
        await base44.entities.FavoritePack.create({
          pack_id: packId,
          favorited_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoritePacks'] });
      toast.success(isFavorited ? "Removed from favorites" : "Added to favorites");
    },
    onError: () => {
      toast.error("Failed to update favorites");
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
        title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={`w-5 h-5 transition-colors ${
            isFavorited
              ? "fill-yellow-400 text-yellow-400"
              : "text-slate-400 hover:text-yellow-400"
          }`}
        />
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="gap-2"
    >
      <Star
        className={`w-4 h-4 ${
          isFavorited ? "fill-yellow-400 text-yellow-400" : "text-slate-400"
        }`}
      />
      {isFavorited ? "Favorited" : "Favorite"}
    </Button>
  );
}