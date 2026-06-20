"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIModifyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function AIModifyButton({
  onClick,
  disabled = false,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: AIModifyButtonProps) {
  const button = (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      size={size}
      className="relative"
    >
      <Sparkles className="h-4 w-4" />
      {showLabel && size !== "icon" && <span className="ml-2">AI Modify</span>}
    </Button>
  );

  if (!showLabel || size === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>AI-Powered Code Modifications</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
