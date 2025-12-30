import { getAnalyticsData } from "@/lib/ga-server";
import { checkRole } from "@/utils/supabase/server";

export async function fetchDashboardAnalytics(days: number = 28) {
  // await checkRole("super_admin"); // Uncomment jika perlu
  await checkRole("super_admin");
  const data = await getAnalyticsData(days);
  return data;
}
