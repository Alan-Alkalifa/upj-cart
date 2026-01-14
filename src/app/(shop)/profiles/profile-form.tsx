"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

interface ProfileFormProps {
  profile: any; // Typed as Database['public']['Tables']['profiles']['Row'] ideally
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProfile(null, formData);
      
      if (result?.error) {
        if (typeof result.error === 'object') {
           // Handle Zod errors (show first one for simplicity or map them)
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
    <form action={handleSubmit} className="space-y-4">
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
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}