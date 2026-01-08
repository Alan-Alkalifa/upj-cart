import "server-only";

// Gunakan Base URL khusus Komerce (RajaOngkir Pro/V2)
const BASE_URL = "https://rajaongkir.komerce.id/api/v1/destination";
const CALCULATE_URL = "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost";
const API_KEY = process.env.RAJAONGKIR_API_KEY!;

export type CourierCode = 'jne' | 'sicepat' | 'jnt' | 'idexpress' | 'sap' | 'ninja' | 'lion' | 'anteraja';

interface ShippingParams {
  origin: string;      // ID Kecamatan/Kelurahan Asal
  destination: string; // ID Kecamatan/Kelurahan Tujuan
  weight: number;      // Gram
  courier: CourierCode;
}

// Interface untuk hasil yang dikembalikan ke UI
export interface ShippingResult {
  service: string;
  description: string;
  cost: { 
    value: number; 
    etd: string; 
  }[];
}

// Helper Fetcher
async function fetchKomerce(url: string, params: Record<string, string> = {}) {
  try {
    const fullUrl = new URL(url);
    Object.keys(params).forEach(key => fullUrl.searchParams.append(key, params[key]));

    const response = await fetch(fullUrl.toString(), {
      method: "GET",
      headers: { "key": API_KEY },
      next: { revalidate: 3600 } // Cache 1 jam
    });

    const data = await response.json();
    if (data.meta?.code !== 200 && data.meta?.code !== "200") {
      // Jika error, lemparkan agar ditangkap catch
      throw new Error(data.meta?.message || "RajaOngkir Error");
    }
    return data.data;
  } catch (err) {
    console.error(`RajaOngkir Fetch Error (${url}):`, err);
    return [];
  }
}

// 1. Ambil Provinsi
export async function getProvinces() {
  return await fetchKomerce(`${BASE_URL}/province`);
}

// 2. Ambil Kota (Butuh ID Provinsi)
export async function getCities(provinceId: string) {
  if (!provinceId) return [];
  return await fetchKomerce(`${BASE_URL}/city/${provinceId}`);
}

// 3. Ambil Kecamatan (Butuh ID Kota)
export async function getDistricts(cityId: string) {
  if (!cityId) return [];
  return await fetchKomerce(`${BASE_URL}/district/${cityId}`);
}

// 4. Ambil Kelurahan/Subdistrict (Butuh ID Kecamatan)
export async function getSubdistricts(districtId: string) {
  if (!districtId) return [];
  return await fetchKomerce(`${BASE_URL}/sub-district/${districtId}`);
}

// 5. Hitung Ongkir
export async function getShippingCost({ origin, destination, weight, courier }: ShippingParams) {
  try {
    const payload = new URLSearchParams();
    payload.append('origin', origin);
    payload.append('destination', destination);
    payload.append('weight', weight.toString());
    payload.append('courier', courier);

    const response = await fetch(CALCULATE_URL, {
      method: "POST",
      headers: {
        "key": API_KEY,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: payload,
      cache: "no-store",
    });

    const data = await response.json();

    if (data.meta?.code !== 200 && data.meta?.code !== "200") {
      return { error: data.meta?.message || "Gagal cek ongkir" };
    }

    // --- FIX START: Correctly parse Komerce API response ---
    const results: ShippingResult[] = [];

    // The Komerce API returns 'data' as a flat array of services
    if (Array.isArray(data.data)) {
      data.data.forEach((svc: any) => {
        results.push({
          // Map fields based on Komerce response structure
          service: svc.service || svc.service_name || svc.code || "Unknown",
          description: svc.description || svc.shipping_name || svc.name || "Standard",
          cost: [{ 
            // Komerce returns cost as a number, UI expects an array
            value: svc.cost || svc.shipping_cost || 0, 
            etd: svc.etd || '-' 
          }]
        });
      });
    }
    // --- FIX END ---

    return { results };

  } catch (err) {
    console.error("Fetch Ongkir Error:", err);
    return { error: "Koneksi ke server ongkir gagal." };
  }
}