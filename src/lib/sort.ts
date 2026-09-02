import { Movie } from "./tauri";

export type SortOption =
  | "added-desc"
  | "added-asc"
  | "title-asc"
  | "title-desc"
  | "director-asc"
  | "director-desc"
  | "release-desc"
  | "release-asc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "added-desc", label: "Recently added" },
  { value: "added-asc", label: "Oldest added" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
  { value: "director-asc", label: "Director (A-Z)" },
  { value: "director-desc", label: "Director (Z-A)" },
  { value: "release-desc", label: "Newest film" },
  { value: "release-asc", label: "Oldest film" },
];

export const DEFAULT_SORT: SortOption = "added-desc";

const SORT_STORAGE_KEY = "elcine.sortBy";

function isSortOption(value: unknown): value is SortOption {
  return SORT_OPTIONS.some((o) => o.value === value);
}

/// A stored value from an older build may name a sort that no longer exists,
/// so anything unrecognized falls back to the default rather than sorting by
/// nothing.
export function loadSort(): SortOption {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    return isSortOption(stored) ? stored : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

export function saveSort(sort: SortOption): void {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  } catch {
    // Sort preference is a convenience; losing it is not worth an error.
  }
}

function addedAt(movie: Movie): number {
  return new Date(movie.created_at).getTime();
}

// Films with no known release year sink to the bottom of both orders rather
// than clumping at whichever end zero would land in.
function byReleaseYear(a: Movie, b: Movie, direction: 1 | -1): number {
  if (a.release_year === null) return b.release_year === null ? 0 : 1;
  if (b.release_year === null) return -1;
  return (a.release_year - b.release_year) * direction;
}

export function compareMovies(a: Movie, b: Movie, sortBy: SortOption): number {
  switch (sortBy) {
    case "added-desc":
      return addedAt(b) - addedAt(a);
    case "added-asc":
      return addedAt(a) - addedAt(b);
    case "title-asc":
      return a.title.localeCompare(b.title);
    case "title-desc":
      return b.title.localeCompare(a.title);
    case "director-asc":
      return a.director.localeCompare(b.director);
    case "director-desc":
      return b.director.localeCompare(a.director);
    case "release-desc":
      return byReleaseYear(a, b, -1);
    case "release-asc":
      return byReleaseYear(a, b, 1);
  }
}
