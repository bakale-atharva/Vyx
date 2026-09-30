import { SignIn } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <SignIn />
      </main>
    </>
  );
}
