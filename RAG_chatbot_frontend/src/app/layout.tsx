import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "RAG ChatBot - Chăm Sóc Khách Hàng Thông Minh",
  description:
    "Hệ thống chatbot AI tích hợp RAG (Retrieval-Augmented Generation) cho chăm sóc khách hàng hiệu quả, chính xác và tức thì.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("font-sans", jakarta.variable)}
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
