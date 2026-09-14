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
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
      {options.map((option) => (
        <button
          key={option.slug}
          type="button"
          onClick={() => onChange(option.slug)}
          aria-pressed={active === option.slug}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            active === option.slug
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
