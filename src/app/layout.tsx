import type { Metadata } from "next";
import { Geist, Geist_Mono, VT323 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dot = VT323({
  weight: "400",
  variable: "--font-dot",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contenta",
  description: "Contenta — AI content assistant for creators",
  icons: {
    icon: "/favicon/favicon.png",
    shortcut: "/favicon/favicon.png",
    apple: "/favicon/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${dot.variable} antialiased bg-black text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

