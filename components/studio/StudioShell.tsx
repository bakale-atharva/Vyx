"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import { GalleryIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { PlanBadge } from "./PlanBadge";
import { StudioBanners } from "./StudioBanners";
import { StudioEffects } from "./StudioEffects";

const NAV = [
  // Uploading lives in the gallery (header buttons and drag-and-drop).
  { href: "/studio", label: "Gallery", Icon: GalleryIcon, exact: true },
] as const;

function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Studio"
      className={cn(
        "flex gap-1",
        orientation === "vertical"
          ? "flex-col"
          : "-mx-4 overflow-x-auto px-4 pb-3",
      )}
    >
      {NAV.map(({ href, label, Icon, ...rest }) => {
        const active =
          "exact" in rest ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150",
              active
                ? "bg-raised text-fg"
                : "text-muted hover:bg-raised/60 hover:text-fg",
            )}
          >
            <Icon
              className={active ? "text-accent" : undefined}
              width={18}
              height={18}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Account() {
  return (
    <div className="flex flex-col gap-3">
      <PlanBadge />
      <UserButton userProfileMode="navigation" userProfileUrl="/studio/billing" />
    </div>
  );
}

export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-line bg-panel p-4 lg:flex">
        <div className="flex flex-col gap-8">
          <Link href="/studio" aria-label="Vyx studio" className="px-2 pt-1">
            <Logo />
          </Link>
          <NavLinks orientation="vertical" />
        </div>
        <div className="border-t border-line pt-4">
          <Account />
        </div>
      </aside>

      <header className="border-b border-line bg-panel px-4 pt-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/studio" aria-label="Vyx studio">
            <Logo size={24} />
          </Link>
          <Account />
        </div>
        <NavLinks orientation="horizontal" />
      </header>

      <main
        id="main"
        className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-8 lg:py-10"
      >
        <StudioBanners />
        {children}
      </main>

      <Suspense fallback={null}>
        <StudioEffects />
      </Suspense>
    </div>
  );
}
