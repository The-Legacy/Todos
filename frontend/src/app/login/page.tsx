"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthForm } from "@/components/auth-form";
import { CheckIcon } from "@/components/icons";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-accent-ink">
          <CheckIcon size={19} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-text-2">Log in to see your tasks.</p>
        </div>
      </div>
      <AuthForm
        mode="login"
        onSubmit={async (email, password) => {
          await login(email, password);
          router.replace("/dashboard");
        }}
      />
      <p className="text-sm text-text-2">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-text underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
