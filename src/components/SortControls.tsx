import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption =
  | "title-asc"
  | "title-desc"
  | "director-asc"
  | "director-desc"
  | "newest"
  | "oldest";

export type FormatFilter = "all" | "DVD" | "Digital" | "Blu-ray";

interface SortControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterFormat: FormatFilter;
  onFilterFormatChange: (format: FormatFilter) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (favoritesOnly: boolean) => void;
}

export function SortControls({
  sortBy,
  onSortChange,
  filterFormat,
  onFilterFormatChange,
  favoritesOnly,
  onFavoritesOnlyChange,
}: SortControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="sort" className="shrink-0">
          Sort by
        </Label>
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger id="sort" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
            <SelectItem value="title-desc">Title (Z-A)</SelectItem>
            <SelectItem value="director-asc">Director (A-Z)</SelectItem>
            <SelectItem value="director-desc">Director (Z-A)</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="format" className="shrink-0">
          Format
        </Label>
        <Select
          value={filterFormat}
          onValueChange={(v) => onFilterFormatChange(v as FormatFilter)}
        >
          <SelectTrigger id="format" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="DVD">DVD</SelectItem>
            <SelectItem value="Digital">Digital</SelectItem>
            <SelectItem value="Blu-ray">Blu-ray</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="favorites"
          checked={favoritesOnly}
          onCheckedChange={(checked) => onFavoritesOnlyChange(checked === true)}
        />
        <Label htmlFor="favorites" className="cursor-pointer">
          Favorites only
        </Label>
      </div>
    </div>
  );
}
