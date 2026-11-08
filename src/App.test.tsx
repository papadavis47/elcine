import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import { Movie } from "@/lib/tauri";
import { movie } from "@/test/fixtures";

const invokeMock = vi.mocked(invoke);

/// Stands in for the Rust command layer, holding rows in memory.
function backend(initial: Movie[]) {
  let rows = [...initial];
  invokeMock.mockImplementation(async (cmd, args) => {
    switch (cmd) {
      case "get_movies":
        return rows;
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
