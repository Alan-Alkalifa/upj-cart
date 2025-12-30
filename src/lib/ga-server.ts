import { BetaAnalyticsDataClient } from "@google-analytics/data";

// 1. Inisialisasi Client dengan Kunci Rahasia
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // Menangani masalah newline pada private key di .env
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const propertyId = process.env.GA_PROPERTY_ID;

export async function getAnalyticsData(days: number = 7) {
  if (!propertyId) throw new Error("GA_PROPERTY_ID belum diset di .env");

  try {
    // A. Request Laporan Dasar (Total Visitor, Pageview, Pendapatan)
    const [basicStats] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`, // Dinamis: misal '7daysAgo'
          endDate: "today",
        },
      ],
      metrics: [
        { name: "activeUsers" },       // Jumlah user aktif
        { name: "screenPageViews" },   // Total halaman dilihat
        { name: "sessions" },          // Total sesi kunjungan
        // { name: "grossPurchaseRevenue" } // Uncomment jika sudah ada data pembelian
      ],
    });

    // B. Request Laporan Halaman Terpopuler
    const [topPages] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: "today",
        },
      ],
      dimensions: [
        { name: "pageTitle" }, // Judul Halaman
        { name: "pagePath" },  // URL Halaman (misal /merchant/sepatu)
      ],
      metrics: [
        { name: "screenPageViews" }, // Diurutkan berdasarkan views
      ],
      limit: 5, // Ambil 5 teratas
    });

    // C. Request Laporan Pencarian Terpopuler (Event 'search')
    const [topSearches] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: "today",
        },
      ],
      dimensions: [
        { name: "searchTerm" }, // Apa yang dicari user? (Butuh setup Custom Dimension di GA4, atau gunakan event parameter)
      ],
      metrics: [
        { name: "eventCount" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "view_search_results", // Event bawaan GA4 untuk search result
          },
        },
      },
      limit: 5,
    });
    
    // --- FORMAT DATA AGAR MUDAH DIPAKAI DI FRONTEND ---
    
    // 1. Parsing Basic Stats
    const row = basicStats.rows?.[0];
    const stats = {
      users: Number(row?.metricValues?.[0].value || 0),
      views: Number(row?.metricValues?.[1].value || 0),
      sessions: Number(row?.metricValues?.[2].value || 0),
      // revenue: Number(row?.metricValues?.[3].value || 0),
    };

    // 2. Parsing Top Pages
    const pages = topPages.rows?.map((row) => ({
      title: row.dimensionValues?.[0].value || "Unknown",
      path: row.dimensionValues?.[1].value || "/",
      views: Number(row.metricValues?.[0].value || 0),
    })) || [];

    return {
      stats,
      pages,
      // searches: ... (Search term butuh setup khusus di GA4 dashboard, kita skip dulu biar tidak error)
    };

  } catch (error) {
    console.error("Gagal mengambil data Analytics:", error);
    // Return nilai 0 agar aplikasi tidak crash jika GA error
    return {
      stats: { users: 0, views: 0, sessions: 0 },
      pages: [],
    };
  }
}