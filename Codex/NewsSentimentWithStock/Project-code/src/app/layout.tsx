import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Sentiment Dashboard",
  description: "Compare recent stock prices with article-level news sentiment."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
