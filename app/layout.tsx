import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HK Deals｜香港每日著數",
  description: "搜尋及整理香港餐飲、購物、娛樂、旅遊及生活優惠。",
  applicationName: "HK Deals"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
