import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import { Movie, TmdbKeySource } from "@/lib/tauri";
import { TMDB_PROMPT_DISMISSED } from "@/lib/settings";
import { movie } from "@/test/fixtures";

const invokeMock = vi.mocked(invoke);

/// Stands in for the Rust command layer, holding rows in memory.
function backend(initial: Movie[], keySource: TmdbKeySource = "saved") {
  let rows = [...initial];
  invokeMock.mockImplementation(async (cmd, args) => {
    switch (cmd) {
      case "get_movies":
        return rows;
      case "get_tmdb_key_status":
        return { source: keySource };
      case "backfill_release_years":
      case "upgrade_posters":
        return 0;
      case "delete_movie":
        rows = rows.filter((m) => m.id !== (args as { id: number }).id);
        return;
      default:
        throw new Error(`unexpected command: ${cmd}`);
    }
  });
}

const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("App", () => {
  beforeEach(() => {
    backend([
      movie({ id: 1, title: "Mirror", created_at: "2026-01-01 00:00:00", is_favorite: true }),
      movie({ id: 2, title: "Alien", created_at: "2026-02-01 00:00:00" }),
    ]);
  });

  it("loads movies newest-added first", async () => {
    render(<App />);
    await waitFor(() => expect(titles()).toEqual(["Alien", "Mirror"]));
    expect(invokeMock).toHaveBeenCalledWith("backfill_release_years");
    expect(invokeMock).toHaveBeenCalledWith("upgrade_posters");
  });

  it("uses the saved sort", async () => {
    localStorage.setItem("elcine.sortBy", "added-asc");
    render(<App />);
    await waitFor(() => expect(titles()).toEqual(["Mirror", "Alien"]));
  });

  it("filters to favorites", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Alien");

    await user.click(screen.getByLabelText("Favorites only"));

    expect(titles()).toEqual(["Mirror"]);
  });

  it("deletes a movie and refetches", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Alien");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(invokeMock).toHaveBeenCalledWith("delete_movie", { id: 2 });
    await waitFor(() => expect(titles()).toEqual(["Mirror"]));
  });

  it("shows the empty state for a new collection", async () => {
    backend([]);
    render(<App />);
    expect(await screen.findByText("Add your first movie to get started")).toBeInTheDocument();
  });
});

describe("first-run TMDB prompt", () => {
  it("opens when no key is configured", async () => {
    backend([], null);
    render(<App />);
    expect(await screen.findByRole("dialog", { name: "Welcome to elcine" })).toBeInTheDocument();
  });

  it("stays closed once skipped", async () => {
    const user = userEvent.setup();
    backend([], null);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Skip for now" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem(TMDB_PROMPT_DISMISSED)).toBe("1");
  });

  it("does not open after being dismissed before", async () => {
    localStorage.setItem(TMDB_PROMPT_DISMISSED, "1");
    backend([], null);
    render(<App />);
    await screen.findByText("Add your first movie to get started");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("get_tmdb_key_status");
  });

  it.each(["saved", "env"] as const)("does not open when a key comes from %s", async (source) => {
    backend([], source);
    render(<App />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("get_tmdb_key_status"));
    await screen.findByText("Add your first movie to get started");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens settings from the header", async () => {
    const user = userEvent.setup();
    backend([]);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByText("A TMDB key is saved.")).toBeInTheDocument();
  });
});
