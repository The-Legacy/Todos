"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthForm } from "@/components/auth-form";
import { CheckIcon } from "@/components/icons";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-accent-ink">
          <CheckIcon size={19} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold">Create your account</h1>
          <p className="text-sm text-text-2">Set up your weekly planner.</p>
        </div>
      </div>
      <AuthForm
        mode="signup"
        onSubmit={async (email, password) => {
          await signup(email, password);
          router.replace("/dashboard");
        }}
      />
      <p className="text-sm text-text-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-text underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
