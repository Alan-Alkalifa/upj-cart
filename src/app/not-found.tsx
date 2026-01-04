"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-background p-4">
      <Empty className="border-border">
        <EmptyMedia variant="icon">
          <FileQuestion className="text-muted-foreground" />
        </EmptyMedia>
        
        <EmptyHeader>
          <EmptyTitle>Halaman Tidak Ditemukan</EmptyTitle>
          <EmptyDescription>
            Maaf, halaman yang Anda cari tidak tersedia atau tautan yang Anda tuju mungkin salah.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button asChild>
            <Link href="/">
              Kembali ke Beranda
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}