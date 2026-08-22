# AGENTS.md

## Project Overview

**elcine** - A personal movie collection manager. Track films you own with director info, personal notes, format (DVD/Digital/Blu-ray), favorites, and TMDB poster art.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
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

# Preview
pnpm preview          # Preview production build
```

## Project Structure

```
├── src/                    # Frontend React source
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── MovieCard.tsx   # Movie display card
│   │   ├── MovieForm.tsx   # Add/edit movie form
│   │   ├── MovieDialog.tsx # Dialog wrapper for form
│   │   ├── MovieGrid.tsx   # Responsive movie grid
│   │   └── SortControls.tsx# Sort/filter controls
│   ├── lib/
│   │   ├── utils.ts        # cn() utility from shadcn
│   │   └── tauri.ts        # Typed Tauri invoke wrappers
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
  format TEXT CHECK(format IN ('DVD', 'Digital', 'Blu-ray')) NOT NULL,
  tmdb_id INTEGER,
  poster_path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Data Storage

- **Database**: `~/.local/share/com.papa.elcine/elcine.db` (Linux). Path comes from Tauri's `app_data_dir()`, which uses the bundle **identifier** in `tauri.conf.json`, not `productName`.
- **Posters**: `~/.local/share/com.papa.elcine/posters/` (cached from TMDB at w342 size)

## Environment Variables

The TMDB API key is stored in `src-tauri/.env` (gitignored):
```
TMDB_API_KEY=your_key_here
```

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
