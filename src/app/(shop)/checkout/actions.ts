"use server";

import { 
  getProvinces, 
  getCities, 
  getDistricts, 
  getSubdistricts, 
  getShippingCost, 
  CourierCode 
} from "@/lib/rajaongkir";
import { createClient } from "@/utils/supabase/server";
import { processCheckout as processCheckoutCore } from "@/app/actions/checkout-actions";

// --- LOCATION DATA FETCHING ---
export async function getLocationData(type: 'province' | 'city' | 'district' | 'subdistrict', parentId?: string) {
  switch (type) {
    case 'province':
      return await getProvinces();
    case 'city':
      return parentId ? await getCities(parentId) : [];
    case 'district':
      return parentId ? await getDistricts(parentId) : [];
    case 'subdistrict':
      return parentId ? await getSubdistricts(parentId) : [];
    default:
      return [];
  }
}

// --- SHIPPING CALCULATION ---
export async function calculateShippingAction(
  origin: string, 
  destination: string, 
  weight: number, 
  courier: string
) {
  const validCouriers = ['jne', 'sicepat', 'jnt', 'idexpress', 'sap', 'ninja', 'lion', 'anteraja'];
  if (!validCouriers.includes(courier)) {
      return { error: "Kurir tidak didukung" };
  }
  
  return await getShippingCost({ 
      origin, 
      destination, 
      weight, 
      courier: courier as CourierCode 
  });
}

// --- ADDRESS ACTIONS ---
export async function addUserAddressAction(addressData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { error: "Unauthorized" };

    const payload = {
        user_id: user.id,
        label: addressData.label,
        recipient_name: addressData.recipient_name,
        phone: addressData.phone,
        street_address: addressData.street_address,
        postal_code: addressData.postal_code,
        
        // IDs
        province_id: addressData.province_id,
        city_id: addressData.city_id,
        district_id: addressData.district_id,
        subdistrict_id: addressData.subdistrict_id,
        
        // Names
        province_name: addressData.province_name,
        city_name: addressData.city_name,
        district_name: addressData.district_name,
        subdistrict_name: addressData.subdistrict_name,
        
        // Required field 'city' di DB
        city: addressData.city_name || "", 
        
        is_default: false 
    };

    const { error } = await supabase.from('user_addresses').insert(payload);

    if (error) {
        console.error("Add Address Error:", error);
        return { error: error.message };
    }
    return { success: true };
}

// Wrapper untuk processCheckout
// UPDATE: Menambahkan parameter couponId
export async function processCheckout(
  items: any, 
  addressId: string, 
  shipping: any, 
  districtId: string,
  couponId: string | null
) {
    return processCheckoutCore(items, addressId, shipping, districtId, couponId);
}