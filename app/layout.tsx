import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
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
  title: "Vyx",
  description:
    "A photo and video editor app, inspired by Sonny Sangha, vibecoded using Claude.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ cssLayerName: "clerk" }}>
          <ConvexClientProvider>
          <header className="flex h-16 items-center justify-between border-b border-black/[.08] px-6 font-sans dark:border-white/[.145]">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50"
            >
              Vyx
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium">
              <Show when="signed-out">
                <SignInButton>
                  <button className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-solid border-black/[.08] px-4 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="flex h-10 cursor-pointer items-center justify-center rounded-full bg-foreground px-4 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}