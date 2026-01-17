# AGENTS.md

## Project Overview

**elcine** - A Tauri 2 desktop application with React 19, Vite, and Tailwind CSS v4.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **Build Tool**: Vite 7
- **Desktop Runtime**: Tauri 2
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
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Utilities (includes cn() from shadcn)
│   ├── hooks/              # Custom React hooks
│   ├── App.tsx             # Main app component
│   ├── App.css             # Global styles + Tailwind CSS
│   └── main.tsx            # Entry point
├── src-tauri/              # Tauri Rust backend
│   ├── src/                # Rust source code
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── components.json         # shadcn/ui configuration
└── tailwind.config.ts      # Tailwind configuration
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
