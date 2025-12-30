import { sendGAEvent } from "@next/third-parties/google";
import { Database } from "@/types/supabase";

// --- TYPE DEFINITIONS ---
type Product = Database["public"]["Tables"]["products"]["Row"] & {
  organizations?: { name: string } | null;
  global_categories?: { name: string } | null; 
};

type Variant = Database["public"]["Tables"]["product_variants"]["Row"];

export const trackEvent = {
  // --- E-COMMERCE EVENTS (YANG SUDAH ADA) ---

  viewItem: (product: Product) => {
    sendGAEvent("event", "view_item", {
      currency: "IDR",
      value: product.base_price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.global_categories?.name || "Uncategorized",
          item_brand: product.organizations?.name || "UPJ Cart Store",
          price: product.base_price,
        },
      ],
    });
  },

  addToCart: (params: { 
    product: Product; 
    variantName: string; 
    quantity: number; 
    finalPrice: number 
  }) => {
    sendGAEvent("event", "add_to_cart", {
      currency: "IDR",
      value: params.finalPrice * params.quantity,
      items: [
        {
          item_id: params.product.id,
          item_name: params.product.name,
          item_category: params.product.global_categories?.name,
          item_variant: params.variantName,
          item_brand: params.product.organizations?.name,
          price: params.finalPrice,
          quantity: params.quantity,
        },
      ],
    });
  },

  viewCart: (cartItems: any[], totalValue: number) => {
    const items = transformCartItemsToGA4(cartItems);
    sendGAEvent("event", "view_cart", {
      currency: "IDR",
      value: totalValue,
      items: items
    });
  },

  beginCheckout: (cartItems: any[], totalValue: number) => {
    const items = transformCartItemsToGA4(cartItems);
    sendGAEvent("event", "begin_checkout", {
      currency: "IDR",
      value: totalValue,
      items: items
    });
  },

  // --- NEW: SEARCH & LIST EVENTS ---

  /**
   * 5. Search
   * Melacak apa yang dicari user dan berapa hasilnya
   */
  search: (searchTerm: string, resultCount: number = 0) => {
    sendGAEvent("event", "search", {
      search_term: searchTerm,
      number_of_results: resultCount
    });
  },
  
  /**
   * 6. View Item List
   * Melacak impresi produk di halaman Search / Kategori / Toko
   */
  viewItemList: (params: { 
    listId: string;
    listName: string;
    products: Product[];
  }) => {
    sendGAEvent("event", "view_item_list", {
      item_list_id: params.listId,
      item_list_name: params.listName,
      items: params.products.map((p, index) => ({
        item_id: p.id,
        item_name: p.name,
        index: index + 1, // Posisi urutan (Ranking 1, 2, dst)
        item_brand: p.organizations?.name,
        item_category: p.global_categories?.name,
        price: p.base_price,
        currency: "IDR"
      }))
    });
  }
};

// --- INTERNAL HELPER ---
function transformCartItemsToGA4(cartItems: any[]) {
  return cartItems.map((item) => {
    const variant = Array.isArray(item.product_variants) 
      ? item.product_variants[0] 
      : item.product_variants;
      
    const product = variant?.products;
    const org = product?.organizations;
    const category = product?.global_categories;
    const price = variant?.price_override ?? product?.base_price ?? 0;

    return {
      item_id: product?.id || "unknown",
      item_name: product?.name || "Unknown Product",
      item_variant: variant?.name,
      item_brand: org?.name,
      item_category: category?.name,
      price: price,
      quantity: item.quantity,
      currency: "IDR"
    };
  });
}