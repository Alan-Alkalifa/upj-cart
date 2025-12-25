"use client"

import { useState, useTransition } from "react"
import { updatePlatformSettings } from "../actions"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition()
  
  // Local State Form
  const [formData, setFormData] = useState({
    platform_name: initialData.platform_name,
    support_email: initialData.support_email,
    transaction_fee_percent: initialData.transaction_fee_percent,
    is_maintenance_mode: initialData.is_maintenance_mode,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updatePlatformSettings(formData)
      if (res?.error) {
        toast.error("Gagal menyimpan", { description: res.error })
      } else {
        toast.success("Pengaturan Disimpan", { description: "Konfigurasi platform telah diperbarui." })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* 1. General Info */}
      <Card>
        <CardHeader>
          <CardTitle>Identitas Aplikasi</CardTitle>
          <CardDescription>Informasi dasar yang tampil di email dan footer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Platform</Label>
            <Input 
              id="name" 
              value={formData.platform_name}
              onChange={(e) => setFormData({...formData, platform_name: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email Support (Admin)</Label>
            <Input 
              id="email" 
              type="email"
              value={formData.support_email}
              onChange={(e) => setFormData({...formData, support_email: e.target.value})}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Business Logic (Fee) */}
      <Card>
        <CardHeader>
          <CardTitle>Monetisasi (Biaya Layanan)</CardTitle>
          <CardDescription>
            Persentase yang diambil platform dari setiap transaksi merchant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fee">Biaya Admin (%)</Label>
            <div className="flex items-center gap-2">
                <Input 
                id="fee" 
                type="number" 
                step="0.1"
                className="w-[100px]"
                value={formData.transaction_fee_percent}
                onChange={(e) => setFormData({...formData, transaction_fee_percent: parseFloat(e.target.value) || 0})}
                />
                <span className="text-muted-foreground">% per transaksi</span>
            </div>
            <p className="text-[12px] text-muted-foreground">
                Contoh: Jika diisi 5%, maka penjualan Rp 100.000 akan memberikan merchant Rp 95.000, dan platform Rp 5.000.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. System Control */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Kontrol akses sistem.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Maintenance Mode</Label>
            <p className="text-sm text-muted-foreground">
              Jika aktif, user biasa tidak akan bisa mengakses situs.
            </p>
          </div>
          <Switch 
            checked={formData.is_maintenance_mode}
            onCheckedChange={(checked) => setFormData({...formData, is_maintenance_mode: checked})}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan
        </Button>
      </div>
    </form>
  )
}