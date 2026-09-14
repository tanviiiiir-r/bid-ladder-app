import { cn } from "@/lib/utils";

type Category = { id: string; slug: string; name: string };

type Props = {
  categories: Category[];
  active: string;
  onChange: (slug: string) => void;
};

export function CategoryFilter({ categories, active, onChange }: Props) {
  const options = [{ id: "all", slug: "all", name: "All" }, ...categories];

  return (
    <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-full border border-border bg-card/70 p-1">
      {options.map((option) => (
        <button
          key={option.slug}
          type="button"
          onClick={() => onChange(option.slug)}
          aria-pressed={active === option.slug}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
            active === option.slug
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface hover:text-foreground",
          )}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
