"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({ 
  children, 
  className, 
  variant = "outline", 
  size = "icon" 
}: ShareButtonProps) {
  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link disalin!", {
        description: "Tautan berhasil disalin ke clipboard."
      });
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleCopy}
      className={cn(
        !children && "rounded-full h-10 w-10 text-muted-foreground hover:text-foreground transition-colors", 
        className
      )}
      title="Bagikan"
    >
      {children || <Share2 className="h-5 w-5" />}
    </Button>
  );
}