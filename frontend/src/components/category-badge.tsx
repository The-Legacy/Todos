import type { Category } from "@todos/shared";

interface CategoryBadgeProps {
  category: Category | null | undefined;
  compact?: boolean;
}

export function CategoryBadge({ category, compact }: CategoryBadgeProps) {
  if (!category) {
    return compact ? null : <span className="text-xs text-text-3">No category</span>;
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: category.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
        {category.name}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1.5 text-[11.5px] font-semibold"
      style={{ backgroundColor: `${category.color}1a`, color: category.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  );
}
