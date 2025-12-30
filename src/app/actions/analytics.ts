"use server";

import { getAnalyticsData } from "@/lib/ga-server";
import { checkRole } from "@/utils/supabase/server"; // Import dari file yang baru kita update

export async function fetchDashboardAnalytics(days: number = 28) {
  // 1. Keamanan: Pastikan hanya Super Admin yang bisa akses
  // Jika user bukan super_admin, kode akan berhenti dan throw error di sini
  await checkRole("super_admin"); 
  
  // 2. Panggil service GA
  const data = await getAnalyticsData(days);
  
  return data;
}