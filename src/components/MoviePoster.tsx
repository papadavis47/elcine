import { motion } from "motion/react";
import { Movie, getPosterSrc } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface MoviePosterProps {
  movie: Movie;
  /** Corner radius in px. Set via style so Motion keeps it undistorted mid-flight. */
  radius: number;
  /** Square bottom corners, for sitting atop a card body. */
  flatBottom?: boolean;
  className?: string;
  imgClassName?: string;
}

/// Poster shared between card and detail view. Same `layoutId` in both places
/// lets Motion fly it from one to the other.
export function MoviePoster({ movie, radius, flatBottom, className, imgClassName }: MoviePosterProps) {
  const posterSrc = getPosterSrc(movie.poster_path);
  return (
    <motion.div
      layoutId={`poster-${movie.id}`}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      style={{
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        borderBottomLeftRadius: flatBottom ? 0 : radius,
        borderBottomRightRadius: flatBottom ? 0 : radius,
      }}
      className={cn("overflow-hidden bg-muted", className)}
    >
      {posterSrc ? (
        <img
          src={posterSrc}
          alt={movie.title}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
