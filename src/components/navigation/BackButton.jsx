import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ className = "", variant = "ghost", label = "Back" }) {
  const navigate = useNavigate();

  return (
    <Button
      variant={variant}
      onClick={() => navigate(-1)}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  );
}