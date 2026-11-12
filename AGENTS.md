# AGENTS.md

## Project Overview

**elcine** - A personal movie collection manager. Track films you own with director info, personal notes, format (DVD/Digital/Blu-ray), favorites, and TMDB poster art.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **Animation**: Motion (`motion/react`); `MotionConfig reducedMotion="user"` in App
- **Build Tool**: Vite 8
- **Desktop Runtime**: Tauri 2
- **Database**: Turso (embedded SQLite-compatible, local only)
- **External API**: TMDB for movie search, director lookup, and poster images
- **Package Manager**: pnpm

## Commands

```bash
# Development
pnpm dev              # Start Vite dev server (frontend only)
pnpm tauri dev        # Start Tauri development (frontend + Rust backend)

# Build
pnpm build            # TypeScript check + Vite production build
pnpm tauri build      # Build Tauri desktop application
pnpm tauri build --bundles deb   # .deb only; install: sudo apt install ./src-tauri/target/release/bundle/deb/elcine_*_amd64.deb
pnpm tauri build --bundles appimage   # AppImage only; run: ./src-tauri/target/release/bundle/appimage/elcine_*_amd64.AppImage
pnpm tauri build --bundles deb,appimage   # release assets (bundle/deb/, bundle/appimage/); upload to GitHub release

# Preview
pnpm preview          # Preview production build

# Test (frontend; Vitest + Testing Library + jsdom)
pnpm test             # run once
pnpm test:watch       # watch mode

# Test (Rust; run from src-tauri/)
cargo test            # db layer, hermetic
cargo test -- --ignored   # + TMDB network tests, needs .env key and internet
```

## Release

Bump version in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`; commit, tag `vX.Y.Z`, push. Then:

```bash
pnpm tauri build --bundles deb,appimage
B=src-tauri/target/release/bundle; V=X.Y.Z
(cd $B/deb && sha256sum elcine_${V}_amd64.deb; cd ../appimage && sha256sum elcine_${V}_amd64.AppImage) > $B/SHA256SUMS
gh release create v$V --title "elcine v$V" --notes-file notes.md --latest \
  $B/deb/elcine_${V}_amd64.deb $B/appimage/elcine_${V}_amd64.AppImage $B/SHA256SUMS
```

`SHA256SUMS` lands in gitignored `target/`; keep `notes.md` out of the repo too. Notes sections: Added / Changed / Verify download / Getting started.

## Project Structure

```
├── src/                    # Frontend React source
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Logo.tsx        # Header logo: icon + outlined wordmark
│   │   ├── wordmark.ts     # Generated wordmark path (docs/brand/build.py)
│   │   ├── MovieCard.tsx   # Movie display card (hover zoom, click opens detail)
│   │   ├── MoviePoster.tsx # Poster shared by card + detail (Motion layoutId)
│   │   ├── MovieDetail.tsx # Centered read-only view, poster flies in
│   │   ├── MovieForm.tsx   # Add/edit movie form
│   │   ├── MovieDialog.tsx # Dialog wrapper for form
│   │   ├── MovieGrid.tsx   # Responsive grid; scroll fade-in, sort reflow (Motion)
│   │   ├── SettingsDialog.tsx # TMDB key settings + first-run welcome
│   │   ├── SortControls.tsx# Sort/filter controls
│   │   └── ThemeToggle.tsx # Light/dark toggle
│   ├── lib/
│   │   ├── utils.ts        # cn() utility from shadcn
│   │   ├── tauri.ts        # Typed Tauri invoke wrappers
│   │   ├── settings.ts     # Settings constants (TMDB URL, prompt flag)
│   │   ├── sort.ts         # Sort by date added / release year
│   │   └── theme.ts        # Theme persistence + apply
│   ├── test/               # Vitest setup (Tauri invoke mock) + fixtures
│   ├── App.tsx             # Main app component
│   ├── App.css             # Global styles + Tailwind CSS
│   └── main.tsx            # Entry point
├── src-tauri/              # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs         # Rust entry point
│   │   ├── lib.rs          # App setup, state management
│   │   ├── commands.rs     # Tauri command handlers
│   │   ├── db.rs           # Turso database operations
│   │   ├── tmdb.rs         # TMDB API client
│   │   └── models.rs       # Movie struct definitions
│   ├── .env                # TMDB_API_KEY (gitignored)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── docs/brand/             # Logo source: icon SVG/1024 PNG, banners, build.py, fonts/ (OFL)
└── components.json         # shadcn/ui configuration (Tailwind v4: theme lives in src/App.css)
```

## Database Schema

```sql
CREATE TABLE movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  director TEXT NOT NULL,
  notes TEXT,
  is_favorite INTEGER DEFAULT 0,
  format TEXT NOT NULL,          -- 'DVD' | 'Digital' | 'Blu-ray'; no DB CHECK, enforced by Rust `Format` enum (models.rs)
  tmdb_id INTEGER,
  poster_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  release_year INTEGER
);

CREATE TABLE settings (          -- key/value app settings
  key TEXT PRIMARY KEY,          -- e.g. 'tmdb_api_key'
  value TEXT NOT NULL
);
```

Schema lives in `src-tauri/src/db.rs`. Older DBs get `release_year` via an `ALTER TABLE` migration on startup.

## Data Storage

Paths below are for release builds. Debug builds (`pnpm tauri dev`) put DB + posters under a `dev/` subdir instead (`lib::data_dir`, `cfg!(debug_assertions)`), so dev never touches the installed app's data. WebView localStorage (theme, TMDB prompt flag) is still shared.

- **Database**: `~/.local/share/io.github.papadavis47.elcine/elcine.db` (Linux). Path comes from Tauri's `app_data_dir()`, which uses the bundle **identifier** in `tauri.conf.json`, not `productName`. Identifier was `com.papa.elcine` before v0.1.2; old data must be moved by hand (no auto-migration).
- **Posters**: `~/.local/share/io.github.papadavis47.elcine/posters/` (cached from TMDB at w780, named `{tmdb_id}-w780.{ext}`; DB `poster_path` stores the **file name only**, commands resolve it to a full path for the frontend (`with_poster_path`); pre-v0.1.2 absolute paths are cut down by `db::migrate`; older w342 files are re-downloaded on startup by `upgrade_posters`)

## TMDB API Key

Resolved per call by `commands::tmdb_key`: a key saved in the app (Settings dialog, `settings` table, cached in `AppState.tmdb_key`) wins; otherwise `TMDB_API_KEY` from env or `.env` (dev fallback, e.g. `src-tauri/.env`, gitignored). No key: TMDB lookups are skipped silently. `set_tmdb_api_key` validates against TMDB `/configuration` before saving.

First launch with no key opens the Settings dialog in welcome mode once; dismissal is stored in localStorage `elcine.tmdbPromptDismissed`.

```
TMDB_API_KEY=your_key_here
```

## Branding

- Icon: palette "Deep Ocean" (bg `#0f2a3d`, poster `#2f8f9d`, frames `#ffd28a`, bookmark `#ff7a59`); wordmark DM Sans SemiBold, subtitle Noto Sans; both bundled (OFL) in `docs/brand/fonts/`.
- Rebuild banners + `src/components/wordmark.ts` after font/text changes: `uv run --with fonttools --with uharfbuzz python docs/brand/build.py`.
- Social preview: `docs/brand/elcine-social.png` (1280x640), made from the build.py SVG via `inkscape docs/brand/elcine-social.svg -w 1280 -h 640 -o docs/brand/elcine-social.png`; upload manually in GitHub Settings (no API).
- Regenerate app icons: `pnpm tauri icon docs/brand/elcine-icon-1024.png` (delete the generated `android/` and `ios/` dirs).

## Path Aliases

- `@/*` → `./src/*`

## Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Code Style

- Use TypeScript for all frontend code
- Use Tailwind CSS utility classes for styling
- Import shadcn/ui components from `@/components/ui`
- Use `cn()` utility from `@/lib/utils` for conditional class merging
- Frontend tests sit beside source as `*.test.ts(x)`; mock the backend by stubbing `invoke` (see `src/App.test.tsx`)
