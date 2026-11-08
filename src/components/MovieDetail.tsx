import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoviePoster } from "@/components/MoviePoster";
import { formatColors } from "@/components/MovieCard";
import { Movie } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface MovieDetailProps {
  movie: Movie | null;
  onClose: () => void;
  onEdit: (movie: Movie) => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

/// Centered, read-only view of one movie. The poster flies in from its card
/// (shared `layoutId`); text fades in beside it once it lands.
export function MovieDetail({ movie, onClose, onEdit }: MovieDetailProps) {
  return (
    <DialogPrimitive.Root open={movie !== null} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {movie && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              forceMount
              aria-describedby={undefined}
              // Clicks on the empty area around the panel close it, like the overlay.
              onClick={(e) => e.target === e.currentTarget && onClose()}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 focus:outline-none"
            >
              <div className="flex max-h-full w-full max-w-6xl flex-col items-center justify-center gap-8 md:flex-row">
                {/* Sized by height to use the window; the vw cap keeps width
                    (2/3 of height) at most half the window, leaving room for
                    the panel. */}
                <MoviePoster
                  movie={movie}
                  radius={14}
                  className="aspect-2/3 h-[min(50vh,32rem)] w-auto shrink-0 shadow-2xl md:h-[min(85vh,56rem,75vw)]"
                />
                <motion.div
                  className="relative flex max-h-[40vh] w-full min-w-0 max-w-xl flex-col md:max-h-[85vh] md:flex-1 gap-4 overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-2xl"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: 0.15 } }}
                  exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                >
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <DialogPrimitive.Title className="text-2xl font-semibold leading-tight">
                      {movie.title}
                    </DialogPrimitive.Title>
                    <Badge className={cn("shrink-0 text-white", formatColors[movie.format])}>
                      {movie.format}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {movie.director}
                    {movie.release_year !== null && (
                      <span className={cn("tabular-nums", movie.director && "ml-2")}>
                        {movie.release_year}
                      </span>
                    )}
                    {movie.is_favorite && <span className="ml-2 text-yellow-500">★ Favorite</span>}
                  </p>
                  {movie.notes ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{movie.notes}</p>
                  ) : (
                    <p className="italic text-muted-foreground">No notes yet.</p>
                  )}
                  <div className="mt-auto flex justify-end pt-2">
                    <Button variant="outline" onClick={() => onEdit(movie)}>
                      Edit
                    </Button>
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Close"
                    className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
