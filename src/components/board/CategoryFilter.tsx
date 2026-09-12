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
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((option) => (
        <button
          key={option.slug}
          type="button"
          onClick={() => onChange(option.slug)}
          aria-pressed={active === option.slug}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === option.slug
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
