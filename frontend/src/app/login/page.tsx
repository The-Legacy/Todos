"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-zinc-500">Log in to see your tasks.</p>
      </div>
      <AuthForm
        mode="login"
        onSubmit={async (email, password) => {
          await login(email, password);
          router.replace("/dashboard");
        }}
      />
      <p className="text-sm text-zinc-500">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-white">
          Sign up
        </Link>
      </p>
    </div>
  );
}
