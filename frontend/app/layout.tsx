import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import SideNav from "@/components/SideNav";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Reelcraft — From Idea to Upload, One Studio",
  description: "Your AI studio for smarter content: naming, scripting, and producing YouTube videos, end to end.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body grain min-h-screen overflow-x-hidden`}>
        <SideNav />
        <main className="min-h-screen md:ml-[260px] pt-14 md:pt-0">{children}</main>
      </body>
    </html>
  );
}
