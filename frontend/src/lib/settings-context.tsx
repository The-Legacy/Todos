"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { WeekStartDay } from "@todos/shared";

const STORAGE_KEY = "todos.preferences";

interface Preferences {
  weekStartsOn: WeekStartDay;
  defaultDurationMinutes: number | null;
}

const DEFAULT_PREFERENCES: Preferences = {
  weekStartsOn: 1,
  defaultDurationMinutes: null,
};

function readStoredPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface SettingsContextValue extends Preferences {
  setWeekStartsOn: (day: WeekStartDay) => void;
  setDefaultDurationMinutes: (minutes: number | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readStoredPreferences);

  const persist = useCallback((next: Preferences) => {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setWeekStartsOn = useCallback(
    (weekStartsOn: WeekStartDay) => persist({ ...preferences, weekStartsOn }),
    [preferences, persist],
  );

  const setDefaultDurationMinutes = useCallback(
    (defaultDurationMinutes: number | null) => persist({ ...preferences, defaultDurationMinutes }),
    [preferences, persist],
  );

  const value = useMemo(
    () => ({ ...preferences, setWeekStartsOn, setDefaultDurationMinutes }),
    [preferences, setWeekStartsOn, setDefaultDurationMinutes],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
