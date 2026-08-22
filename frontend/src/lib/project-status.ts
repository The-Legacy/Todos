import type { ProjectStatus } from "@todos/shared";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "bg-teal-tint text-teal",
  completed: "bg-surface-2 text-text-3",
  archived: "bg-amber-tint text-amber",
};
