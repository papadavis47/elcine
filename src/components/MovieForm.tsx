import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Movie, CreateMovie, UpdateMovie } from "@/lib/tauri";

interface MovieFormProps {
  movie?: Movie;
  onSubmit: (movie: CreateMovie | UpdateMovie) => void;
  onCancel: () => void;
}

type Format = "DVD" | "Digital" | "Blu-ray";

export function MovieForm({ movie, onSubmit, onCancel }: MovieFormProps) {
  const [title, setTitle] = useState(movie?.title ?? "");
  const [director, setDirector] = useState(movie?.director ?? "");
  const [notes, setNotes] = useState(movie?.notes ?? "");
  const [format, setFormat] = useState<Format>(movie?.format ?? "DVD");
  const [releaseYear, setReleaseYear] = useState(
    movie?.release_year !== null && movie?.release_year !== undefined
      ? String(movie.release_year)
      : ""
  );
  const [isFavorite, setIsFavorite] = useState(movie?.is_favorite ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedYear = parseInt(releaseYear, 10);
    const release_year = Number.isNaN(parsedYear) ? null : parsedYear;

    if (movie) {
      const updateData: UpdateMovie = {
        id: movie.id,
        title,
        director,
        notes: notes || null,
        is_favorite: isFavorite,
        format,
        release_year,
      };
      onSubmit(updateData);
    } else {
      const createData: CreateMovie = {
        title,
        director: director || null,
        notes: notes || null,
        is_favorite: isFavorite,
        format,
        release_year,
      };
      onSubmit(createData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Movie title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="director">Director</Label>
        <Input
          id="director"
          value={director}
          onChange={(e) => setDirector(e.target.value)}
          placeholder="Will be fetched from TMDB if empty"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="release-year">Year</Label>
        <Input
          id="release-year"
          type="number"
          inputMode="numeric"
          min={1888}
          max={2100}
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
          placeholder="Will be fetched from TMDB if empty"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Your notes about this movie"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="format">Format</Label>
        <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DVD">DVD</SelectItem>
            <SelectItem value="Digital">Digital</SelectItem>
            <SelectItem value="Blu-ray">Blu-ray</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="favorite"
          checked={isFavorite}
          onCheckedChange={(checked) => setIsFavorite(checked === true)}
        />
        <Label htmlFor="favorite" className="cursor-pointer">
          Mark as favorite
        </Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {movie ? "Update" : "Add"} Movie
        </Button>
      </div>
    </form>
  );
}
