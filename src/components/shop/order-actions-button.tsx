// src/components/shop/order-action-buttons.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeOrder, submitOrderReviews } from "@/app/actions/order";
import { toast } from "sonner";
import { CheckCircle, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  variant: {
    name: string;
    product: {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
  } | null;
}

interface OrderActionButtonsProps {
  orderId: string;
  orderStatus: string;
  items: OrderItem[];
  hasReviewed: boolean;
}

export function OrderActionButtons({
  orderId,
  orderStatus,
  items,
  hasReviewed,
}: OrderActionButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const router = useRouter();

  // State for reviews: Map productId -> { rating, comment }
  const [reviews, setReviews] = useState<
    Record<string, { rating: number; comment: string }>
  >({});

  // 1. Handle Complete Order
  const handleCompleteOrder = async () => {
    try {
      setLoading(true);
      const res = await completeOrder(orderId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Pesanan selesai! Terima kasih telah berbelanja.");
        router.refresh();
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Review Submission
  const handleSubmitReviews = async () => {
    // Filter out items that haven't been rated
    const reviewsToSubmit = Object.entries(reviews).map(([productId, data]) => ({
      productId,
      rating: data.rating,
      comment: data.comment,
    }));

    if (reviewsToSubmit.length === 0) {
      toast.error("Mohon berikan rating minimal untuk satu produk.");
      return;
    }

    try {
      setLoading(true);
      const res = await submitOrderReviews(orderId, reviewsToSubmit);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Ulasan berhasil dikirim!");
        setReviewOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error("Gagal mengirim ulasan.");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (productId: string, rating: number) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], rating },
    }));
  };

  const handleCommentChange = (productId: string, comment: string) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], comment },
    }));
  };

  // Only valid products (not deleted)
  const validItems = items.filter((i) => i.variant?.product);

  if (orderStatus === "shipped") {
    return (
      <Button
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        onClick={handleCompleteOrder}
        disabled={loading}
      >
        {loading ? "Memproses..." : "Pesanan Diterima & Selesai"}
      </Button>
    );
  }

  if (orderStatus === "completed" && !hasReviewed) {
    return (
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Star className="mr-2 h-4 w-4" /> Beri Ulasan
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Beri Ulasan Produk</DialogTitle>
            <DialogDescription>
              Bagaimana pengalamanmu dengan produk di pesanan ini?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {validItems.map((item) => {
              const product = item.variant!.product!;
              const currentReview = reviews[product.id] || { rating: 0, comment: "" };

              return (
                <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                  <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden border">
                    <Image
                      src={product.image_url || "/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Varian: {item.variant!.name}
                    </p>
                    
                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(product.id, star)}
                          className={`text-2xl focus:outline-none transition-colors ${
                            star <= currentReview.rating
                              ? "text-yellow-400"
                              : "text-gray-200 hover:text-yellow-200"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    {/* Comment */}
                    <Textarea
                      placeholder="Tulis ulasanmu di sini..."
                      value={currentReview.comment}
                      onChange={(e) => handleCommentChange(product.id, e.target.value)}
                      className="resize-none text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button onClick={handleSubmitReviews} disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Ulasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (orderStatus === "completed" && hasReviewed) {
    return (
      <Button variant="secondary" disabled className="w-full opacity-75">
        <CheckCircle className="mr-2 h-4 w-4" /> Ulasan Terkirim
      </Button>
    );
  }

  return null;
}