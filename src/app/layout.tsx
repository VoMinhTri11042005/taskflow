import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "TaskFlow - Quản lý công việc nhóm",
  description: "Ứng dụng quản lý phân chia công việc nhóm tích hợp Google Docs & Google Sheets",
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
      <body
        className="antialiased bg-background text-foreground"
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
