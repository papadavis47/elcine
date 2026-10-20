import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieCard } from "./MovieCard";
import { movie } from "@/test/fixtures";

describe("MovieCard", () => {
  it("shows title, director, year, format and notes", () => {
    render(
      <MovieCard
        movie={movie({ format: "Blu-ray", notes: "zone" })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Stalker" })).toBeInTheDocument();
    expect(screen.getByText("Andrei Tarkovsky")).toBeInTheDocument();
    expect(screen.getByText("1979")).toBeInTheDocument();
    expect(screen.getByText("Blu-ray")).toBeInTheDocument();
    expect(screen.getByText("zone")).toBeInTheDocument();
  });

  it("renders the cached poster through the asset protocol", () => {
    render(
      <MovieCard
        movie={movie({ poster_path: "/posters/1398.jpg" })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "Stalker" })).toHaveAttribute(
      "src",
      "asset://localhost//posters/1398.jpg",
    );
  });

  it("omits the year when unknown and the poster when missing", () => {
    render(
      <MovieCard movie={movie({ release_year: null })} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByText("1979")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("passes the movie to onEdit and its id to onDelete", async () => {
    const m = movie({ id: 7 });
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<MovieCard movie={m} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onEdit).toHaveBeenCalledWith(m);
    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
