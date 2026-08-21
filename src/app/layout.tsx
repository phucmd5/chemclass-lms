import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChemClass LMS - Quản Lý Lớp Học & Đề Thi Hoá Học",
  description: "Nền tảng quản lý dạy học, sinh đề AI và thi trắc nghiệm Hoá học chuẩn Serverless",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
