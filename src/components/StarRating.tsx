import { useState } from "react";

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
    <div
      className={`star-rating${compact ? " star-rating-compact" : ""}`}
      aria-label={label}
      onMouseLeave={() => setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={value <= displayValue ? "rating-star rating-star-filled" : "rating-star"}
          aria-label={`${label}: ${value} star${value === 1 ? "" : "s"}`}
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
