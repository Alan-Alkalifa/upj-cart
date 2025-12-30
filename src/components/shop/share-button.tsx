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
  // Tambahkan props opsional ini untuk mengatasi error TypeScript
  url?: string;
  title?: string;
}

export function ShareButton({ 
  children, 
  className, 
  variant = "outline", 
  size = "icon",
  url,    // Destructure prop url
  title   // Destructure prop title
}: ShareButtonProps) {
  
  const handleCopy = () => {
    if (typeof window !== "undefined") {
      // Prioritaskan URL dari props. Jika tidak ada, gunakan URL browser saat ini.
      const textToCopy = url || window.location.href;

      navigator.clipboard.writeText(textToCopy);
      
      toast.success("Link disalin!", {
        description: title 
          ? `Tautan untuk "${title}" berhasil disalin.` 
          : "Tautan berhasil disalin ke clipboard."
      });
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleCopy}
      className={cn(
        !children && "h-10 w-10 text-muted-foreground hover:text-foreground transition-colors", 
        className
      )}
      title="Bagikan"
    >
      {children || <Share2 className="h-5 w-5" />}
    </Button>
  );
}