import "server-only";

const API_KEY = process.env.RAJAONGKIR_API_KEY!;
const BASE_URL = process.env.RAJAONGKIR_BASE_URL!;
const LOCATION_TYPE = process.env.RAJAONGKIR_LOCATION_TYPE || 'subdistrict';

export type CourierCode = 'jne' | 'pos' | 'tiki';

interface ShippingParams {
  origin: string;
  destination: string;
  weight: number;
  courier: CourierCode;
}

// Helper untuk fetch data lokasi
async function fetchLocation(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "key": API_KEY },
      next: { revalidate: 3600 } // Cache 1 jam
    });
    const data = await response.json();
    if (data.rajaongkir.status.code !== 200) throw new Error(data.rajaongkir.status.description);
    return data.rajaongkir.results;
  } catch (err) {
    console.error(`RajaOngkir Fetch Error (${endpoint}):`, err);
    return [];
  }
}

export async function getProvinces() {
  return await fetchLocation("province");
}

export async function getCities(provinceId: string) {
  return await fetchLocation("city", { province: provinceId });
}

export async function getSubdistricts(cityId: string) {
  // Note: Endpoint subdistrict hanya tersedia di akun Pro/Starter tertentu
  // Jika gagal, mungkin perlu fallback atau handle error di UI
  return await fetchLocation("subdistrict", { city: cityId });
}

export async function getShippingCost({ origin, destination, weight, courier }: ShippingParams) {
  try {
    const response = await fetch(`${BASE_URL}/cost`, {
      method: "POST",
      headers: {
        "key": API_KEY,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        origin: origin,
        originType: LOCATION_TYPE,
        destination: destination,
        destinationType: LOCATION_TYPE,
        weight: weight.toString(),
        courier: courier,
      }),
      cache: "no-store", 
    });

    const data = await response.json();

    if (data.rajaongkir.status.code !== 200) {
      console.error("RajaOngkir Error:", data.rajaongkir.status.description);
      return { error: data.rajaongkir.status.description };
    }

    return { results: data.rajaongkir.results[0].costs };
  } catch (err) {
    console.error("Fetch Error:", err);
    return { error: "Failed to connect to shipping provider." };
  }
}