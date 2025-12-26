"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { couponSchema } from "@/lib/marketing-schemas";
import { createCoupon, deleteCoupon, toggleCouponStatus } from "./actions";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";

// Use z.input to get the input type (before transformation)
type CouponFormInput = z.input<typeof couponSchema>;

export function CouponClient({
  coupons,
  orgId,
}: {
  coupons: any[];
  orgId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Use the input type for the form
  const form = useForm<CouponFormInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discount_percent: 10,
      max_uses: 100,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  });

  // The onSubmit receives the input type from the form
  async function onSubmit(values: CouponFormInput) {
    startTransition(async () => {
      // Parse with Zod to ensure defaults are applied and get the output type
      const validated = couponSchema.parse(values);
      const res = await createCoupon(orgId, validated);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Kupon dibuat!");
        setIsOpen(false);
        form.reset();
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteCoupon(id);
      toast.success("Kupon dihapus");
    });
  }

  function onToggle(id: string, status: boolean) {
    startTransition(async () => {
      await toggleCouponStatus(id, status);
      toast.success("Status diperbarui");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kupon Diskon</h2>
          <p className="text-muted-foreground">
            Buat kode promo untuk menarik pembeli.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Buat Kupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Kupon Baru</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Kupon</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CONTOH: MABA2024"
                          className="uppercase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diskon (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_uses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Penggunaan</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berlaku Hingga</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}{" "}
                  Simpan
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Diskon</TableHead>
              <TableHead>Pemakaian</TableHead>
              <TableHead>Kadaluarsa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Belum ada kupon.
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold text-primary">
                  {c.code}
                </TableCell>
                <TableCell>{c.discount_percent}%</TableCell>
                <TableCell>
                  {c.times_used} / {c.max_uses === -1 ? "∞" : c.max_uses}
                </TableCell>
                <TableCell>
                  {new Date(c.expires_at).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={() => onToggle(c.id, c.is_active)}
                    disabled={isPending}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini tidak dapat dibatalkan. Kupon{" "}
                          <b>{c.code}</b> akan dihapus permanen.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(c.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}