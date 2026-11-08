import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieGrid } from "./MovieGrid";
import { movie } from "@/test/fixtures";

// jsdom has no layout, so Motion never finishes the shared-poster exit and the
// closing dialog stays mounted. Assert Radix's closed state instead; unmount
// itself was checked in a real browser.
const expectClosed = () =>
  waitFor(() =>
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("data-state", "closed"),
  );

describe("MovieGrid detail view", () => {
  const m = movie({
    id: 3,
    title: "Solaris",
    notes: "Long notes\nsecond line",
    poster_path: "/posters/s.jpg",
  });

  it("opens the clicked movie centered with full notes", async () => {
    const user = userEvent.setup();
    render(<MovieGrid movies={[m]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "View Solaris" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Solaris" })).toBeInTheDocument();
    expect(within(dialog).getByText(/second line/)).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: "Solaris" })).toBeInTheDocument();
  });

  it("edits from the detail view and closes it", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<MovieGrid movies={[m]} onEdit={onEdit} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "View Solaris" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(m);
    await expectClosed();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<MovieGrid movies={[m]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "View Solaris" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await expectClosed();
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    render(<MovieGrid movies={[m]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "View Solaris" }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    await expectClosed();
  });

  it("shows a placeholder when there are no notes", async () => {
    const user = userEvent.setup();
    render(<MovieGrid movies={[movie({ title: "Ivan" })]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "View Ivan" }));

    expect(await screen.findByText("No notes yet.")).toBeInTheDocument();
  });
});
