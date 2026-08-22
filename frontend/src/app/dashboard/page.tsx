"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Signed in as {user?.email}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Log out
        </button>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700">
        Task planning views land in the next phase — this confirms your account, session, and
        default categories are wired up end to end.
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
