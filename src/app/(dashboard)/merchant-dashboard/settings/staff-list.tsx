"use client"

import { useState, useTransition } from "react"
import { addStaffMember, removeStaffMember } from "./staff-actions"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Plus, Trash2, UserPlus, ShieldAlert, Lock } from "lucide-react"

interface StaffListProps {
  members: any[]
  orgId: string
  currentUserId: string
  currentUserRole: string // New Prop
}

export function StaffList({ members, orgId, currentUserId, currentUserRole }: StaffListProps) {
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [email, setEmail] = useState("")

  // Check Permissions: Only Owner or Admin can manage staff
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  function handleAdd() {
    if (!email) return
    startTransition(async () => {
      const res = await addStaffMember(orgId, email)
      if (res?.error) {
        toast.error("Gagal menambah staff", { description: res.error })
      } else {
        toast.success("Staff berhasil ditambahkan")
        setIsAddOpen(false)
        setEmail("")
      }
    })
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const res = await removeStaffMember(memberId)
      if (res?.error) {
        toast.error("Gagal menghapus", { description: res.error })
      } else {
        toast.success("Akses staff dicabut")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Daftar Staff</CardTitle>
          <CardDescription>Kelola tim yang memiliki akses ke dashboard toko ini.</CardDescription>
        </div>
        
        {/* LOGIC: Only Show "Add Staff" if canManage is true */}
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Tambah Staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Undang Staff Baru</DialogTitle>
                <DialogDescription>
                  Pastikan user tersebut <b>sudah mendaftar</b> di aplikasi ini sebelumnya.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="email.staff@contoh.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleAdd} disabled={isPending || !email} className="w-full">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tambahkan Akses
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Belum ada staff lain.</TableCell></TableRow>
              )}
              {members.map((m) => {
                const isMe = m.profiles?.id === currentUserId
                
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.profiles?.avatar_url} />
                        <AvatarFallback>{m.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.profiles?.full_name}
                      {isMe && <Badge variant="outline" className="ml-2">Anda</Badge>}
                    </TableCell>
                    <TableCell>{m.profiles?.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === 'owner' ? "default" : "secondary"} className="uppercase text-[10px]">
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      
                      {/* LOGIC: Only show Delete button if (canManage AND not myself) */}
                      {canManage && !isMe ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={isPending}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <div className="flex items-center gap-2 text-destructive font-bold mb-2">
                                <ShieldAlert className="h-5 w-5" /> Hapus Akses Staff?
                              </div>
                              <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Staff <b>{m.profiles?.full_name}</b> tidak akan bisa mengakses dashboard toko ini lagi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => {
                                  e.preventDefault() 
                                  handleRemove(m.id)
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isPending}
                              >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        // Optional: Show Lock icon for Staff users viewing other users
                        !isMe && <Lock className="h-4 w-4 text-muted-foreground/30 ml-auto" />
                      )}

                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}