import { useEffect, useState } from "react";
import "./App.css";
import { MotionConfig } from "motion/react";
import { Button } from "@/components/ui/button";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieDialog } from "@/components/MovieDialog";
import { SortControls, FormatFilter } from "@/components/SortControls";
import { SortOption, compareMovies, loadSort, saveSort } from "@/lib/sort";
import {
  Movie,
  CreateMovie,
  UpdateMovie,
  getMovies,
  addMovie,
  updateMovie,
  deleteMovie,
  backfillReleaseYears,
} from "@/lib/tauri";

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>(loadSort);
  const [filterFormat, setFilterFormat] = useState<FormatFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | undefined>();

  const fetchMovies = async () => {
    try {
      const data = await getMovies();
      setMovies(data);
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  // Movies added before release years were stored have none. Fill them in once
  // per launch; offline just means they fill in on a later run.
  useEffect(() => {
    backfillReleaseYears()
      .then((filled) => {
        if (filled > 0) fetchMovies();
      })
      .catch((error) => console.error("Failed to backfill release years:", error));
  }, []);

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    saveSort(sort);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl instanceof HTMLInputElement ||
                      activeEl instanceof HTMLTextAreaElement ||
                      activeEl?.getAttribute("contenteditable") === "true";
      
      if (isInput) return;

      const scrollAmount = 100;
      if (e.key === "j") {
        window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (e.key === "k") {
        window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSave = async (data: CreateMovie | UpdateMovie) => {
    try {
      if ("id" in data) {
        await updateMovie(data);
      } else {
        await addMovie(data);
      }
      await fetchMovies();
      setEditingMovie(undefined);
    } catch (error) {
      console.error("Failed to save movie:", error);
    }
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMovie(id);
      await fetchMovies();
    } catch (error) {
      console.error("Failed to delete movie:", error);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMovie(undefined);
    }
  };

  const filteredAndSortedMovies = movies
    .filter((movie) => {
      if (filterFormat !== "all" && movie.format !== filterFormat) return false;
      if (favoritesOnly && !movie.is_favorite) return false;
      return true;
    })
    .sort((a, b) => compareMovies(a, b, sortBy));

  return (
    // "user": honour the OS reduce-motion setting (fades only, no movement).
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">elcine</h1>
            <MovieDialog
              trigger={<Button>Add Movie</Button>}
              movie={editingMovie}
              onSave={handleSave}
              open={dialogOpen}
              onOpenChange={handleDialogOpenChange}
            />
          </header>

          <SortControls
            sortBy={sortBy}
            onSortChange={handleSortChange}
            filterFormat={filterFormat}
            onFilterFormatChange={setFilterFormat}
            favoritesOnly={favoritesOnly}
            onFavoritesOnlyChange={setFavoritesOnly}
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading movies...</div>
            </div>
          ) : filteredAndSortedMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
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
                className="mb-4 text-muted-foreground"
              >
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
              <h2 className="text-lg font-medium">No movies found</h2>
              <p className="text-muted-foreground">
                {movies.length === 0
                  ? "Add your first movie to get started"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <MovieGrid
              movies={filteredAndSortedMovies}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>
    </MotionConfig>
  );
}

export default App;
