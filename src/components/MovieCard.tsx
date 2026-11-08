import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoviePoster } from "@/components/MoviePoster";
import { Movie } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: Movie;
  /** Poster is showing in the detail view; leave its slot empty here. */
  isSelected?: boolean;
  onOpen?: () => void;
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
}

export const formatColors = {
  DVD: "bg-blue-500 hover:bg-blue-600",
  Digital: "bg-green-500 hover:bg-green-600",
  "Blu-ray": "bg-purple-500 hover:bg-purple-600",
};

// rounded-xl (14px) minus the 1px card border.
const POSTER_RADIUS = 13;

export function MovieCard({ movie, isSelected = false, onOpen, onEdit, onDelete }: MovieCardProps) {
  return (
    <Card className="group flex h-full flex-col transition-shadow duration-300 hover:shadow-xl">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${movie.title}`}
        className="relative block aspect-2/3 w-full cursor-pointer rounded-t-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {!isSelected && (
          <MoviePoster
            movie={movie}
            radius={POSTER_RADIUS}
            flatBottom
            className="absolute inset-0"
            imgClassName="transition-[scale] duration-500 ease-out motion-safe:group-hover:scale-105"
          />
        )}
        {movie.is_favorite && (
          <div className="absolute top-2 right-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-yellow-400 drop-shadow"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        )}
      </button>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-2">
            {movie.title}
          </h3>
          <Badge
            className={cn("shrink-0 text-white", formatColors[movie.format])}
          >
            {movie.format}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {movie.director}
          {movie.release_year !== null && (
            <span className={cn("tabular-nums", movie.director && "ml-2")}>
              {movie.release_year}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {movie.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {movie.notes}
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(movie)}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onDelete(movie.id)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
