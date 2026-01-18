import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MovieForm } from "@/components/MovieForm";
import { Movie, CreateMovie, UpdateMovie } from "@/lib/tauri";

interface MovieDialogProps {
  trigger: React.ReactNode;
  movie?: Movie;
  onSave: (movie: CreateMovie | UpdateMovie) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovieDialog({
  trigger,
  movie,
  onSave,
  open,
  onOpenChange,
}: MovieDialogProps) {
  const handleSubmit = (data: CreateMovie | UpdateMovie) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{movie ? "Edit Movie" : "Add Movie"}</DialogTitle>
        </DialogHeader>
        <MovieForm
          movie={movie}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
