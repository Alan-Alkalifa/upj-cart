import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // min-h-screen: Pastikan background mengisi penuh layar
    // bg-muted/40: Warna background konsisten untuk semua halaman auth
    <div className="min-h-screen w-full bg-muted/40">
      {children}
    </div>
  );
}