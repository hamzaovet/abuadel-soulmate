import type { Metadata } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/PwaBootAndPushButton";

export const metadata: Metadata = {
  title: "مجموعة حلواني أبو عادل & سول ميت كافيه VIP ☕🍰",
  description:
    "المنظومة السحابية الذكية لإدارة حلواني أبو عادل وسول ميت كافيه - طلب الترابيزات بالـ QR، شاشة المطبخ والبار KDS، كاشير وترابيزات، ومحرك الريسيبي وتكاليف التصنيع وحسابات الخزنة والورديات.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "أبو عادل & سول ميت",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090d" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('abuadel_theme');if(t==='light'){var r=document.documentElement;r.classList.remove('dark');r.classList.add('light');r.style.colorScheme='light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f4f6fb');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#07070a] text-slate-100 antialiased font-sans selection:bg-amber-500 selection:text-black transition-colors duration-200">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
