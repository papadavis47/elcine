import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieForm } from "./MovieForm";
import { movie } from "@/test/fixtures";

function setup(props: Partial<Parameters<typeof MovieForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<MovieForm onSubmit={onSubmit} onCancel={onCancel} {...props} />);
  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe("MovieForm", () => {
  it("submits a create payload with blanks sent as null", async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText("Title *"), "Stalker");
    await user.click(screen.getByRole("button", { name: "Add Movie" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Stalker",
      director: null,
      notes: null,
      is_favorite: false,
      format: "DVD",
      release_year: null,
    });
  });

  it("parses the year and includes every filled field", async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText("Title *"), "Mirror");
    await user.type(screen.getByLabelText("Director"), "Andrei Tarkovsky");
    await user.type(screen.getByLabelText("Year"), "1975");
    await user.type(screen.getByLabelText("Notes"), "memory");
    await user.click(screen.getByLabelText("Mark as favorite"));
    await user.click(screen.getByRole("button", { name: "Add Movie" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Mirror",
      director: "Andrei Tarkovsky",
      notes: "memory",
      is_favorite: true,
      format: "DVD",
      release_year: 1975,
    });
  });

  it("won't submit without a title", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Add Movie" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills from an existing movie and submits an update payload", async () => {
    const existing = movie({ id: 42, format: "Blu-ray", notes: "zone", is_favorite: true });
    const { onSubmit, user } = setup({ movie: existing });

    expect(screen.getByLabelText("Title *")).toHaveValue("Stalker");
    expect(screen.getByLabelText("Year")).toHaveValue(1979);

    const title = screen.getByLabelText("Title *");
    await user.clear(title);
    await user.type(title, "Solaris");
    await user.click(screen.getByRole("button", { name: "Update Movie" }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: 42,
      title: "Solaris",
      director: "Andrei Tarkovsky",
      notes: "zone",
      is_favorite: true,
      format: "Blu-ray",
      release_year: 1979,
    });
  });

  it("cancels without submitting", async () => {
    const { onSubmit, onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
