<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/elcine-banner-dark.svg">
    <img alt="elcine — your film collection" src="docs/brand/elcine-banner-light.svg" width="480">
  </picture>
</p>

A desktop app for logging the movies you own. Built with Tauri 2, React 19 and an embedded Turso database. Everything stays local.

## Features

- Add movies with title, format (DVD / Digital / Blu-ray), notes and a favorite flag
- Director, release year and poster are filled in automatically from [TMDB](https://www.themoviedb.org/)
- Posters are cached locally, so the collection works offline
- Poster grid with a detail view; sort by date added, title, director or release year
- Filter by format or favorites; light/dark theme
- TMDB key entered in-app (Settings), prompted on first launch

## TMDB key

On first launch, elcine asks for a free [TMDB API key](https://www.themoviedb.org/settings/api) (the "API Key", not the read access token). You can change it later via the gear icon. Prebuilt Linux packages are planned for a later release.

## Build from source

Requires Node + pnpm, Rust, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri dev
```

For development you can skip the prompt by putting `TMDB_API_KEY=...` in `src-tauri/.env`; a key saved in the app takes precedence.

## Commands

```bash
pnpm tauri dev      # run the app
pnpm tauri build    # build a desktop bundle
pnpm test           # frontend tests (Vitest)
cd src-tauri && cargo test   # backend tests
```

## Data

On Linux the database and poster cache live in `~/.local/share/com.papa.elcine/`.

## License

[MIT](LICENSE). Bundled fonts in `docs/brand/fonts/` are under the SIL Open Font License (see the OFL files there).

---

This product uses the TMDB API but is not endorsed or certified by TMDB.
