import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { Logo } from "./Logo";

/** Header for public pages (landing, pricing, auth). The studio has its own shell. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" aria-label="Vyx home" className="rounded-md">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
        <Link href="/pricing" className={buttonStyles("ghost", "md")}>
          Pricing
        </Link>
        <Show when="signed-out">
          <SignInButton>
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
          <SignUpButton>
            <Button variant="primary">Get started</Button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/studio" className={buttonStyles("primary", "md")}>
            Open studio
          </Link>
        </Show>
      </nav>
    </header>
  );
}
