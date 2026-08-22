"use client";

import { useState } from "react";
import { XIcon } from "@/components/icons";

const STORAGE_KEY = "todos.onboarded";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  return (
    <div className="card flex flex-col gap-3 border-accent-tint-2 bg-accent-tint p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-text">Welcome — here&apos;s the workflow</h2>
        <button
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, "true");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-text-2 transition hover:text-text"
        >
          <XIcon size={15} />
        </button>
      </div>
      <ol className="flex flex-col gap-1.5 text-text-2">
        <li>1. Dump everything you might want to do this week into your Backlog.</li>
        <li>2. Each day, pull what you&apos;re actually doing into Today or a spot on the Week grid.</li>
        <li>3. Create a Project for longer-term goals, and pull its tasks into a week when you&apos;re ready.</li>
      </ol>
    </div>
  );
}
