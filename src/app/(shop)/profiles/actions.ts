// src/app/(shop)/profiles/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { 
  getProvinces as fetchProvinces,
  getCities as fetchCities,
  getDistricts as fetchDistricts,
  getSubdistricts as fetchSubdistricts 
} from "@/lib/rajaongkir";

// --- VALIDATION SCHEMAS ---

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number is too short").optional().or(z.literal("")),
});

const addressSchema = z.object({
  label: z.string().min(1, "Label is required (e.g., Home, Office)"),
  recipient_name: z.string().min(2, "Recipient name is required"),
  phone: z.string().min(10, "Phone number is required"),
  street_address: z.string().min(5, "Full address is required"),
  province_id: z.string().min(1, "Province is required"),
  province_name: z.string(),
  city_id: z.string().min(1, "City is required"),
  city_name: z.string(),
  district_id: z.string().min(1, "District is required"),
  district_name: z.string(),
  subdistrict_id: z.string().min(1, "Sub-district is required"),
  subdistrict_name: z.string(),
  postal_code: z.string().min(4, "Postal code is required"),
  is_default: z.boolean().default(false),
});

// --- PROFILE ACTIONS ---

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Handle Text Data
  const rawData = {
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  };

  const validated = profileSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  // 2. Handle Avatar Upload (if present)
  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    // Validate File
    if (avatarFile.size > 2 * 1024 * 1024) { // 2MB limit
      return { error: "Ukuran foto maksimal 2MB" };
    }
    if (!avatarFile.type.startsWith("image/")) {
      return { error: "Format file harus gambar (JPG, PNG, dll)" };
    }

    // Upload to Supabase Storage
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Make sure this bucket exists in your Supabase Storage
      .upload(filePath, avatarFile, {
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      return { error: "Gagal mengupload foto profil" };
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
      
    avatarUrl = publicUrl;
  }

  // 3. Update Profile Database
  const updateData: any = {
    full_name: validated.data.full_name,
    phone: validated.data.phone || null,
  };

  if (avatarUrl) {
    updateData.avatar_url = avatarUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Profile updated successfully" };
}

// --- ADDRESS ACTIONS ---

export async function addAddress(data: z.infer<typeof addressSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const validated = addressSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid data" };

  // If set to default, unset other defaults first
  if (validated.data.is_default) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  // Note: 'city' column in DB is required, we use city_name for it as well
  const { error } = await supabase.from("user_addresses").insert({
    user_id: user.id,
    city: validated.data.city_name, 
    ...validated.data
  });

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function updateAddress(id: string, data: z.infer<typeof addressSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const validated = addressSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid data" };

  if (validated.data.is_default) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("user_addresses")
    .update({
      city: validated.data.city_name,
      ...validated.data
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function deleteAddress(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function setAddressAsDefault(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Unset all
  await supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // 2. Set new default
  const { error } = await supabase
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

// --- LOCATION HELPERS (Exposed to Client) ---

export async function getLocationData(type: 'province' | 'city' | 'district' | 'subdistrict', parentId?: string) {
  try {
    switch (type) {
      case 'province': return await fetchProvinces();
      case 'city': return parentId ? await fetchCities(parentId) : [];
      case 'district': return parentId ? await fetchDistricts(parentId) : [];
      case 'subdistrict': return parentId ? await fetchSubdistricts(parentId) : [];
      default: return [];
    }
  } catch (error) {
    console.error("Location Fetch Error:", error);
    return [];
  }
}