import { Movie } from "@/lib/tauri";

let nextId = 1;

export function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: nextId++,
    title: "Stalker",
    director: "Andrei Tarkovsky",
    notes: null,
    is_favorite: false,
    format: "DVD",
    tmdb_id: null,
    poster_path: null,
    created_at: "2026-01-01 00:00:00",
    release_year: 1979,
    ...overrides,
  };
}
