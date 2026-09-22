import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "TaskFlow - Quản lý công việc nhóm hiện đại",
  description: "Ứng dụng quản lý phân chia công việc nhóm tích hợp Google Docs, Sheets, Slides & Chấm công thời gian thực",
  icons: {
    icon: "/taskflow-avatar-vercel.jpg",
    shortcut: "/taskflow-avatar-vercel.jpg",
    apple: "/taskflow-avatar-vercel.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
