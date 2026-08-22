"use client";

import { useState } from "react";

const STORAGE_KEY = "todos.onboarded";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">Welcome — here&apos;s the workflow</h2>
        <button
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, "true");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          ✕
        </button>
      </div>
      <ol className="flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-300">
        <li>1. Dump everything you might want to do this week into your Backlog.</li>
        <li>2. Each day, pull what you&apos;re actually doing into Today or a spot on the Week grid.</li>
        <li>3. Create a Project for longer-term goals, and pull its tasks into a week when you&apos;re ready.</li>
      </ol>
    </div>
  );
}
