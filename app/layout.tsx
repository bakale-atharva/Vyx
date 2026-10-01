import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ToastProvider } from "@/components/ui/toast";
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
  title: { default: "Vyx", template: "%s · Vyx" },
  description:
    "Edit photos and videos in your browser. Free tools to start, AI when you need it.",
};

/** Clerk widgets follow the Vyx dark palette (no theme package needed). */
const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorBackground: "oklch(0.31 0 0)",
    colorInput: "oklch(0.27 0 0)",
    colorForeground: "oklch(0.96 0.006 90)",
    colorMutedForeground: "oklch(0.8 0.004 90)",
    colorPrimary: "oklch(0.96 0.006 90)",
    colorPrimaryForeground: "oklch(0.18 0 0)",
    colorNeutral: "oklch(0.96 0.006 90)",
    colorDanger: "oklch(0.72 0.19 27)",
    borderRadius: "0.1875rem",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
