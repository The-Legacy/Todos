"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-zinc-500">Set up your weekly planner.</p>
      </div>
      <AuthForm
        mode="signup"
        onSubmit={async (email, password) => {
          await signup(email, password);
          router.replace("/dashboard");
        }}
      />
      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-white">
          Log in
        </Link>
      </p>
    </div>
  );
}
