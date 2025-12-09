import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

/**
 * Reusable empty state component with consistent styling
 */
export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  actionIcon: ActionIcon 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      {Icon && <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />}
      <h3 className="text-xl font-semibold text-slate-700 mb-2">{title}</h3>
      {description && <p className="text-slate-500 mb-6">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700">
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}