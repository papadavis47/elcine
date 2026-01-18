import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface Movie {
  id: number;
  title: string;
  director: string;
  notes: string | null;
  is_favorite: boolean;
  format: "DVD" | "Digital" | "Blu-ray";
  tmdb_id: number | null;
  poster_path: string | null;
  created_at: string;
}

export interface CreateMovie {
  title: string;
  director: string | null;
  notes: string | null;
  is_favorite: boolean;
  format: "DVD" | "Digital" | "Blu-ray";
}

export interface UpdateMovie {
  id: number;
  title: string;
  director: string;
  notes: string | null;
  is_favorite: boolean;
  format: "DVD" | "Digital" | "Blu-ray";
}

export async function getMovies(): Promise<Movie[]> {
  return invoke("get_movies");
}

export async function getMovie(id: number): Promise<Movie> {
  return invoke("get_movie", { id });
}

export async function addMovie(movie: CreateMovie): Promise<Movie> {
  return invoke("add_movie", { movie });
}

export async function updateMovie(movie: UpdateMovie): Promise<Movie> {
  return invoke("update_movie", { movie });
}

export async function deleteMovie(id: number): Promise<void> {
  return invoke("delete_movie", { id });
}

export function getPosterSrc(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return convertFileSrc(posterPath);
}
