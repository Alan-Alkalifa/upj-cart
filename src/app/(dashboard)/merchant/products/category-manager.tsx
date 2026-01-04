"use client"

import { useState, useTransition } from "react"
import { createMerchantCategory, deleteMerchantCategory } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tags, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CategoryManagerProps {
  orgId: string
  categories: { id: string; name: string }[]
}

export function CategoryManager({ orgId, categories }: CategoryManagerProps) {
  const [open, setOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!newCategory.trim()) return

    startTransition(async () => {
      const res = await createMerchantCategory(orgId, newCategory)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Kategori berhasil dibuat")
        setNewCategory("")
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteMerchantCategory(id)
      if (res?.error) {
        toast.error("Gagal menghapus: " + res.error)
      } else {
        toast.success("Kategori dihapus")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tags className="mr-2 h-4 w-4" /> Kategori
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kategori Toko</DialogTitle>
          <DialogDescription>
            Buat kategori khusus untuk toko Anda agar produk lebih rapi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Nama kategori baru..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                 if(e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                 }
              }}
            />
            <Button onClick={handleCreate} disabled={isPending || !newCategory.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* List Categories */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Belum ada kategori.
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <span>{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(cat.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}