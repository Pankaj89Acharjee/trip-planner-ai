import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/header";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EaseMyTrip",
  description: "EaseMyTrip app developed with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>


      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}>
        <SidebarProvider>
          <div className="h-screen bg-gradient-primary w-full flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 flex overflow-hidden"> {children}</main>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
