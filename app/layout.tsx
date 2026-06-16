import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk } from "next/font/google";
import "./styles/global.css";
import { cn } from "@/lib/utils";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KU Credit",
  description: "KU Credit is a credit management system designed for students at Kasetsart University. It provides an easy-to-use interface for tracking and managing academic credits, helping students stay organized and on top of their coursework.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${archivoBlack.variable} ${space.variable}`}>
        {children}
      </body>
    </html>
  );
}
