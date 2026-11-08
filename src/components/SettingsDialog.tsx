import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TmdbKeySource,
  clearTmdbApiKey,
  getTmdbKeyStatus,
  setTmdbApiKey,
} from "@/lib/tauri";
import { TMDB_KEY_URL } from "@/lib/settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Welcome wording and a "Skip for now" button, for the first-launch prompt. */
  firstRun?: boolean;
}

const STATUS_TEXT: Record<"saved" | "env" | "none", string> = {
  saved: "A TMDB key is saved.",
  env: "Using TMDB_API_KEY from the environment. A key saved here takes precedence.",
  none: "No key set. Movies are saved without posters, directors or release years.",
};

export function SettingsDialog({ open, onOpenChange, firstRun = false }: SettingsDialogProps) {
  const [source, setSource] = useState<TmdbKeySource | undefined>();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKey("");
    setError(null);
    setNotice(null);
    getTmdbKeyStatus()
      .then((s) => setSource(s.source))
      .catch((e) => console.error("Failed to read TMDB key status:", e));
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setTmdbApiKey(key);
      setSource("saved");
      setKey("");
      if (firstRun) {
        onOpenChange(false);
      } else {
        setNotice("Key saved. New and edited movies will use it.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setNotice(null);
    try {
      await clearTmdbApiKey();
      const s = await getTmdbKeyStatus();
      setSource(s.source);
      setNotice("Saved key removed.");
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{firstRun ? "Welcome to elcine" : "Settings"}</DialogTitle>
            <DialogDescription>
              {firstRun
                ? "elcine fills in posters, directors and release years from TMDB. Add your free TMDB API key to turn that on."
                : "elcine uses TMDB to fill in posters, directors and release years."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="tmdb-key">TMDB API key</Label>
            <Input
              id="tmdb-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={source === "saved" ? "Enter a new key to replace it" : "Paste your API key"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get one free at{" "}
              <a
                href={TMDB_KEY_URL}
                className="underline underline-offset-2 hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  openUrl(TMDB_KEY_URL).catch((err) => console.error("Failed to open link:", err));
                }}
              >
                themoviedb.org
              </a>{" "}
              (use the "API Key", not the read access token).
            </p>
          </div>

          {source !== undefined && !firstRun && (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span data-testid="tmdb-status">{STATUS_TEXT[source ?? "none"]}</span>
              {source === "saved" && (
                <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
                  Remove
                </Button>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {firstRun ? "Skip for now" : "Close"}
            </Button>
            <Button type="submit" disabled={saving || key.trim() === ""}>
              {saving ? "Checking…" : "Save key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
