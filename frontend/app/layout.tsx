import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
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
  title: "Decouple — Monolith to Microservices",
  description:
    "AI-powered DevTool that analyzes legacy codebases and generates Strangler Fig migration blueprints.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen overflow-hidden bg-background font-sans antialiased`}
      >
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-auto">{children}</main>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "bg-card border border-border text-foreground text-sm font-medium",
              description: "text-muted-foreground",
              error: "border-destructive/50",
            },
          }}
        />
      </body>
    </html>
  );
}
