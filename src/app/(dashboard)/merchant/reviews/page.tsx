import { createClient } from "@/utils/supabase/server"
import { ReviewClient } from "./review-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Import Card
import { Star, MessageSquare, MessageCircleQuestion, ThumbsUp } from "lucide-react" // Import Icons

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  
  if (!member) redirect("/")

  // Fetch Reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      *,
      profiles(full_name, avatar_url),
      orders(id),
      products!inner(name, org_id) 
    `)
    .eq("products.org_id", member.org_id)
    .order("created_at", { ascending: false })

  const safeReviews = reviews || []

  // --- STATS CALCULATION ---
  const totalReviews = safeReviews.length

  // Rata-rata Rating
  const averageRating = totalReviews > 0
    ? (safeReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0"

  // Perlu Dibalas (Belum ada reply_comment)
  const unrepliedCount = safeReviews.filter(r => !r.reply_comment).length

  // Ulasan Positif (Bintang 4 & 5)
  const positiveCount = safeReviews.filter(r => r.rating >= 4).length

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ulasan Pembeli</h2>
        <p className="text-muted-foreground">Pantau reputasi toko dan respon feedback pelanggan.</p>
      </div>

      {/* 2. Stats Cards Section (New) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Toko</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating} / 5.0</div>
            <p className="text-xs text-muted-foreground">Rata-rata kepuasan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perlu Dibalas</CardTitle>
            <MessageCircleQuestion className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unrepliedCount}</div>
            <p className="text-xs text-muted-foreground">Menunggu respon Anda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ulasan</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
            <p className="text-xs text-muted-foreground">Feedback diterima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respon Positif</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{positiveCount}</div>
            <p className="text-xs text-muted-foreground">Bintang 4 & 5</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Interactive List (Client Component) */}
      <ReviewClient reviews={safeReviews} />
    </div>
  )
}