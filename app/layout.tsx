import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مجموعة حلواني أبو عادل & سول ميت كافيه VIP ☕🍰",
  description:
    "المنظومة السحابية الذكية لإدارة حلواني أبو عادل وسول ميت كافيه - طلب الترابيزات بالـ QR، شاشة المطبخ والبار KDS، كاشير وترابيزات، ومحرك الريسيبي وتكاليف التصنيع وحسابات الخزنة والورديات.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#07070a] text-slate-100 antialiased font-sans selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
