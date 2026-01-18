import { MovieCard } from "@/components/MovieCard";
import { Movie } from "@/lib/tauri";

interface MovieGridProps {
  movies: Movie[];
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
}

export function MovieGrid({ movies, onEdit, onDelete }: MovieGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
