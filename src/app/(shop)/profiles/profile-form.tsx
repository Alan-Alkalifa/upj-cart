// src/app/(shop)/profiles/profile-form.tsx
"use client";

import { useTransition, useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";
import { updateProfile } from "./actions";

interface ProfileFormProps {
  profile: any;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection and preview
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 2MB");
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProfile(null, formData);
      
      if (result?.error) {
        if (typeof result.error === 'object') {
           // Handle Zod errors
           const msg = Object.values(result.error).flat()[0];
           toast.error(String(msg));
        } else {
           toast.error(result.error);
        }
      } else {
        toast.success("Profile updated successfully");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      
      {/* Avatar Section */}
      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-6 pb-2">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-muted">
            <AvatarImage src={previewUrl || ""} className="object-cover" />
            <AvatarFallback className="text-2xl bg-muted">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          {/* Overlay Button */}
          <div 
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleTriggerUpload}
          >
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <Label htmlFor="avatar" className="font-medium">Foto Profil</Label>
          <div className="flex flex-col gap-1">
             <Button 
               type="button" 
               variant="outline" 
               size="sm" 
               onClick={handleTriggerUpload}
               disabled={isPending}
               className="gap-2"
             >
               <Upload className="h-4 w-4" />
               Pilih Foto
             </Button>
             <p className="text-[11px] text-muted-foreground">
               Format: JPG, PNG. Maksimal 2MB.
             </p>
          </div>
          {/* Hidden Input */}
          <input
            type="file"
            id="avatar"
            name="avatar"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input 
            id="full_name" 
            name="full_name" 
            defaultValue={profile?.full_name || ""} 
            placeholder="Enter your full name" 
            disabled={isPending}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            name="phone" 
            defaultValue={profile?.phone || ""} 
            placeholder="e.g. 08123456789"
            type="tel" 
            disabled={isPending}
          />
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}