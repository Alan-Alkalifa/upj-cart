import { createClient } from "@/utils/supabase/server"
import { ReviewReplyButton } from "./review-reply-button"
import { ReviewSearch } from "./review-search" // Import komponen search
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MessageSquare, MessageCircleQuestion, ThumbsUp, Reply, MessageCircle, Search } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

export default async function ReviewsPage(props: { searchParams: Promise<{ page?: string, q?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const queryParam = searchParams.q || "" // Ambil kata kunci pencarian
  const perPage = 10
  
  // Hitung index untuk manual pagination (In-Memory)
  const startIndex = (currentPage - 1) * perPage
  const endIndex = startIndex + perPage

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  
  if (!member) redirect("/")

  // --- PARALLEL FETCHING ---
  const [reviewsRes, statsRes] = await Promise.all([
    // 1. Fetch SEMUA Reviews (untuk difilter di aplikasi)
    supabase
      .from("reviews")
      .select(`
        *,
        profiles(full_name, avatar_url),
        orders(id),
        products!inner(name, org_id) 
      `)
      .eq("products.org_id", member.org_id)
      .order("created_at", { ascending: false }),
    
    // 2. Fetch Stats Data (Global, tidak terpengaruh search)
    supabase
      .from("reviews")
      .select("rating, reply_comment, products!inner(org_id)")
      .eq("products.org_id", member.org_id)
  ])

  let allReviews = reviewsRes.data || []
  const allStatsData = statsRes.data || []

  // --- LOGIC SEARCH / FILTERING (In-Memory) ---
  if (queryParam) {
    const lowerQ = queryParam.toLowerCase()
    allReviews = allReviews.filter((r: any) => {
      const matchProduct = r.products?.name?.toLowerCase().includes(lowerQ)
      const matchCustomer = r.profiles?.full_name?.toLowerCase().includes(lowerQ)
      const matchComment = r.comment?.toLowerCase().includes(lowerQ)
      return matchProduct || matchCustomer || matchComment
    })
  }

  // --- MANUAL PAGINATION ---
  const totalCount = allReviews.length
  const paginatedReviews = allReviews.slice(startIndex, endIndex)
  
  // --- STATS CALCULATION ---
  const totalReviews = statsRes.data?.length || 0
  const averageRating = totalReviews > 0
    ? (allStatsData.reduce((acc, r) => acc + r.rating, 0) / allStatsData.length).toFixed(1)
    : "0.0"
  const unrepliedCount = allStatsData.filter(r => !r.reply_comment).length
  const positiveCount = allStatsData.filter(r => r.rating >= 4).length

  // --- PAGINATION UI LOGIC ---
  const totalPages = Math.ceil(totalCount / perPage)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push("ellipsis")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("ellipsis")
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("ellipsis")
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push("ellipsis")
        pages.push(totalPages)
      }
    }
    return pages
  }

  // Helper Pagination Link
  const buildLink = (page: number) => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (queryParam) params.set('q', queryParam)
    return `/merchant-dashboard/reviews?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ulasan Pembeli</h2>
        <p className="text-muted-foreground">Pantau reputasi toko dan respon feedback pelanggan.</p>
      </div>

      {/* 2. Stats Cards */}
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

      {/* 3. Search Bar (Posisi Di Atas List Ulasan) */}
      <div className="flex justify-end">
         <ReviewSearch />
      </div>

      {/* 4. Review List */}
      <div className="space-y-4">
        {paginatedReviews.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 border rounded-md border-dashed text-muted-foreground bg-card">
              {queryParam ? (
                <>
                  <Search className="h-10 w-10 opacity-20 mb-2" />
                  <p>Tidak ditemukan ulasan untuk "{queryParam}".</p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-10 w-10 opacity-20 mb-2" />
                  <p>Belum ada ulasan.</p>
                </>
              )}
           </div>
        ) : (
          paginatedReviews.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row gap-4 space-y-0 pb-2">
                <Avatar>
                   <AvatarImage src={r.profiles?.avatar_url} />
                   <AvatarFallback>{r.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                      <div>
                         <h4 className="font-semibold text-sm">{r.profiles?.full_name || "Pembeli"}</h4>
                         <p className="text-xs text-muted-foreground">
                            Order #{r.orders?.id.slice(0,8)} • {new Date(r.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                         </p>
                      </div>
                      <div className="flex text-yellow-500 mt-1 sm:mt-0">
                         {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted/30"}`} />
                         ))}
                      </div>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                <div className="bg-muted/30 p-3 rounded-md text-sm">
                   <div className="font-medium text-xs text-muted-foreground mb-1">Produk: {r.products?.name}</div>
                   <p>{r.comment || "Tidak ada komentar."}</p>
                   {r.image_url && (
                      <img src={r.image_url} alt="Review" className="mt-2 h-20 w-20 object-cover rounded-md border" />
                   )}
                </div>

                {/* Logic Tampilan Balasan vs Tombol Balas */}
                {r.reply_comment ? (
                   <div className="ml-8 pl-4 border-l-2 border-primary/20 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                         <Reply className="h-3 w-3" /> Balasan Toko
                      </div>
                      <p className="text-sm text-muted-foreground">{r.reply_comment}</p>
                   </div>
                ) : (
                   <div className="flex justify-end">
                      <ReviewReplyButton 
                        reviewId={r.id} 
                        customerName={r.profiles?.full_name || "Pembeli"} 
                        comment={r.comment || ""} 
                      />
                   </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 5. Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{paginatedReviews.length > 0 ? startIndex + 1 : 0}</b> - <b>{Math.min(startIndex + paginatedReviews.length, totalCount)}</b> dari <b>{totalCount}</b> ulasan
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={hasPrev ? buildLink(currentPage - 1) : "#"} 
                    className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasPrev}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) => (
                  <PaginationItem key={i}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink 
                        href={buildLink(Number(page))}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href={hasNext ? buildLink(currentPage + 1) : "#"}
                    className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasNext}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
    </div>
  )
}