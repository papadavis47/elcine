import { useState } from "react";
import { motion } from "motion/react";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetail } from "@/components/MovieDetail";
import { Movie } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface MovieGridProps {
  movies: Movie[];
  onEdit: (movie: Movie) => void;
  onDelete: (id: number) => void;
}

// Widest grid is 4 columns; staggering by column makes each row ripple in.
const COLUMNS = 4;

export function MovieGrid({ movies, onEdit, onDelete }: MovieGridProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // The last opened card stays on top so its poster flies back over its
  // neighbours instead of under them.
  const [raisedId, setRaisedId] = useState<number | null>(null);
  const selected = movies.find((m) => m.id === selectedId) ?? null;

  const open = (id: number) => {
    setSelectedId(id);
    setRaisedId(id);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {movies.map((movie, i) => (
          <motion.div
            key={movie.id}
            layout
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
              delay: (i % COLUMNS) * 0.06,
              layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            }}
            className={cn("relative", raisedId === movie.id && "z-10")}
          >
            <MovieCard
              movie={movie}
              isSelected={movie.id === selectedId}
              onOpen={() => open(movie.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>
      <MovieDetail
        movie={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(movie) => {
          setSelectedId(null);
          onEdit(movie);
        }}
      />
    </>
  );
}
