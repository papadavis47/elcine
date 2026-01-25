import { useRef, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Movie, getPosterSrc } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: Movie;
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
}

const formatColors = {
  DVD: "bg-blue-500 hover:bg-blue-600",
  Digital: "bg-green-500 hover:bg-green-600",
  "Blu-ray": "bg-purple-500 hover:bg-purple-600",
};

export function MovieCard({ movie, onEdit, onDelete }: MovieCardProps) {
  const posterSrc = getPosterSrc(movie.poster_path);
  const notesRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = notesRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [movie.notes]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-2/3 bg-muted">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={movie.title}
            className="h-full w-full object-cover"
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
      </div>
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
        <p className="text-sm text-muted-foreground">{movie.director}</p>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {movie.notes &&
          (isTruncated ? (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <p
                  ref={notesRef}
                  className="text-sm text-muted-foreground line-clamp-2 cursor-pointer"
                >
                  {movie.notes}
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <p className="text-sm">{movie.notes}</p>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <p
              ref={notesRef}
              className="text-sm text-muted-foreground line-clamp-2"
            >
              {movie.notes}
            </p>
          ))}
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
