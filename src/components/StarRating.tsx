import { useState } from "react";
import { cn } from "../lib/cn";

type StarRatingProps = {
  rating: number;
  label: string;
  onRate: (rating: number) => void;
  compact?: boolean;
  large?: boolean;
  stopPropagation?: boolean;
  showValue?: boolean;
};

function StarRating({
  rating,
  label,
  onRate,
  compact = false,
  large = false,
  stopPropagation = false,
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || rating;
  const size = large ? 24 : compact ? 14 : 18;

  return (
    <div className={cn("star-rating", large && "star-rating-lg")} aria-label={label} onMouseLeave={() => setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= displayValue;
        return (
          <button
            key={value}
            type="button"
            className="star-btn"
            aria-label={`${label}: ${value} star${value === 1 ? "" : "s"}`}
            aria-pressed={value === rating}
            onMouseEnter={() => setHoverValue(value)}
            onFocus={() => setHoverValue(value)}
            onBlur={() => setHoverValue(0)}
            onClick={(event) => {
              if (stopPropagation) event.stopPropagation();
              onRate(value);
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2" />
            </svg>
          </button>
        );
      })}
      {showValue && rating > 0 ? <span className="star-rating-value">{rating.toFixed(1)}</span> : null}
    </div>
  );
}

export default StarRating;
