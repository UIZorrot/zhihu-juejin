import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./styles.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const imageUrl = new URL("/og.png", `${protocol}://${host}`);
  return {
    title: "知乎掘金 · 内容评分",
    description: "不是热度榜，是信息价值秤。用六个独立维度判断知乎文章与回答的信息价值。",
    openGraph: {
      title: "知乎掘金",
      description: "不是热度榜，是信息价值秤。",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "知乎掘金",
      description: "不是热度榜，是信息价值秤。",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
