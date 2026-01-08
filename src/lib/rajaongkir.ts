import "server-only";

const API_KEY = process.env.RAJAONGKIR_API_KEY!;
const BASE_URL = process.env.RAJAONGKIR_BASE_URL!;
const LOCATION_TYPE = process.env.RAJAONGKIR_LOCATION_TYPE || 'subdistrict';

export type CourierCode = 'jne' | 'pos' | 'tiki';

interface ShippingParams {
  origin: string;      // The Merchant's Location ID
  destination: string; // The User's Location ID
  weight: number;      // Total weight in grams
  courier: CourierCode;
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
      cache: "no-store", // Don't cache shipping costs
    });

    const data = await response.json();

    if (data.rajaongkir.status.code !== 200) {
      console.error("RajaOngkir Error:", data.rajaongkir.status.description);
      return { error: data.rajaongkir.status.description };
    }

    // Returns array of services (e.g., [{ service: "REG", cost: [{ value: 10000, etd: "1-2" }] }])
    return { results: data.rajaongkir.results[0].costs };
  } catch (err) {
    console.error("Fetch Error:", err);
    return { error: "Failed to connect to shipping provider." };
  }
}