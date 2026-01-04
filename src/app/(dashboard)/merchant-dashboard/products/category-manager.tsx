"use client"

import { useState, useTransition } from "react"
import { createMerchantCategory, deleteMerchantCategory, updateMerchantCategory } from "./actions"
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
import { Tags, Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"

interface CategoryManagerProps {
  orgId: string
  categories: { id: string; name: string }[]
}

export function CategoryManager({ orgId, categories }: CategoryManagerProps) {
  const [open, setOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  
  // --- Edit State ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const [isPending, startTransition] = useTransition()

  // Create
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

  // Delete
  const handleDelete = (id: string) => {
    // Optional: Add window.confirm check if needed
    startTransition(async () => {
      const res = await deleteMerchantCategory(id)
      if (res?.error) {
        toast.error("Gagal menghapus: " + res.error)
      } else {
        toast.success("Kategori dihapus")
      }
    })
  }

  // --- Edit Handlers ---
  const startEditing = (cat: { id: string, name: string }) => {
    setEditingId(cat.id)
    setEditName(cat.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName("")
  }

  const saveEditing = (id: string) => {
    if (!editName.trim()) return

    startTransition(async () => {
      const res = await updateMerchantCategory(id, editName)
      if (res?.error) {
        toast.error("Gagal update: " + res.error)
      } else {
        toast.success("Kategori diperbarui")
        setEditingId(null)
        setEditName("")
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
            Buat dan kelola kategori khusus untuk toko Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Nama kategori baru..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              disabled={isPending}
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
                  className="flex items-center justify-between rounded-md border p-2 text-sm group min-h-[46px]"
                >
                  {editingId === cat.id ? (
                    // Edit Mode
                    <div className="flex flex-1 items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <Input 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            disabled={isPending}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    e.preventDefault();
                                    saveEditing(cat.id);
                                } else if (e.key === 'Escape') {
                                    cancelEditing();
                                }
                            }}
                        />
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => saveEditing(cat.id)}
                                disabled={isPending}
                                title="Simpan"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                onClick={cancelEditing}
                                disabled={isPending}
                                title="Batal"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                        <span className="truncate flex-1 pl-1">{cat.name}</span>
                        {/* Removed 'opacity-0 sm:group-hover:opacity-100' so buttons are always visible */}
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => startEditing(cat)}
                                disabled={isPending}
                                title="Edit"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(cat.id)}
                                disabled={isPending}
                                title="Hapus"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}