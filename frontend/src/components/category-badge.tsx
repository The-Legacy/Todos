import type { Category } from "@todos/shared";

export function CategoryBadge({ category }: { category: Category | null | undefined }) {
  if (!category) {
    return <span className="text-xs text-zinc-400">No category</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${category.color}1a`, color: category.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  );
}
