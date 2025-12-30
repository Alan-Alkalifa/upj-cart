"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

interface SearchTrackerProps {
  query?: string
  categoryName?: string
  storeName?: string
  products: any[]
}

export function SearchTracker({ query, categoryName, storeName, products }: SearchTrackerProps) {
  useEffect(() => {
    // 1. Tentukan konteks List (Apakah ini hasil Search, Kategori, atau Toko?)
    let listId = "all_products"
    let listName = "All Products"

    if (query) {
      listId = "search_results"
      listName = `Search: ${query}`
      // Lacak event pencarian spesifik
      trackEvent.search(query, products.length)
    } else if (categoryName) {
      listId = "category_list"
      listName = `Category: ${categoryName}`
    } else if (storeName) {
      listId = "store_profile"
      listName = `Store: ${storeName}`
    }

    // 2. Lacak Impresi Produk (View Item List)
    // Hanya kirim jika ada produk yang ditampilkan
    if (products.length > 0) {
      trackEvent.viewItemList({
        listId,
        listName,
        products
      })
    }
  }, [query, categoryName, storeName, products])

  return null // Tidak merender UI
}