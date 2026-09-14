import { cn } from "@/lib/utils";
import { BOARDS, type BoardKind } from "@/lib/ranking";

const LABELS: Record<BoardKind, string> = {
  all_time: "All-time",
  today: "Today",
  daily: "Daily",
};

export function BoardTabs({
  active,
  onChange,
}: {
  active: BoardKind;
  onChange: (board: BoardKind) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Board"
      className="inline-flex w-full min-w-0 max-w-sm items-center gap-1"
    >
      {BOARDS.map((board) => {
        const isActive = board === active;
        return (
          <button
            key={board}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(board)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[board]}
          </button>
        );
      })}
    </div>
  );
}
