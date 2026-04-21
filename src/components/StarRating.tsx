import { useState } from "react";
import { cn } from "../lib/cn";

type StarRatingProps = {
  rating: number;
  label: string;
  onRate: (rating: number) => void;
  compact?: boolean;
  stopPropagation?: boolean;
};

function StarRating({
  rating,
  label,
  onRate,
  compact = false,
  stopPropagation = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || rating;

  return (
    <div className={cn("flex items-center", compact ? "gap-0.5" : "gap-1")} aria-label={label} onMouseLeave={() => setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={cn(
            "rounded-full border border-transparent bg-transparent p-1 leading-none transition",
            "text-shadow-xs text-shadow-accent-60",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-10",
            compact ? "text-lg" : "text-2xl",
            value <= displayValue ? "text-accent-45" : "text-panel-25",
            "hover:text-accent-60",
          )}
          aria-label={`${label}: ${value} star${value === 1 ? "" : "s"}`}
          aria-pressed={value === rating}
          data-filled={value <= displayValue}
          onMouseEnter={() => setHoverValue(value)}
          onFocus={() => setHoverValue(value)}
          onBlur={() => setHoverValue(0)}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
            onRate(value);
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default StarRating;
