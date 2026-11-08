import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { SettingsDialog } from "./SettingsDialog";
import { TmdbKeySource } from "@/lib/tauri";

const invokeMock = vi.mocked(invoke);

/// Fake backend: `valid` is the only key TMDB accepts.
function backend(initial: TmdbKeySource) {
  let source = initial;
  invokeMock.mockImplementation(async (cmd, args) => {
    switch (cmd) {
      case "get_tmdb_key_status":
        return { source };
      case "set_tmdb_api_key":
        // Real backend trims before validating.
        if ((args as { key: string }).key.trim() !== "valid") {
          throw "TMDB rejected this key. Check it and try again.";
        }
        source = "saved";
        return;
      case "clear_tmdb_api_key":
        source = null;
        return;
      default:
        throw new Error(`unexpected command: ${cmd}`);
    }
  });
}

const keyInput = () => screen.getByLabelText("TMDB API key");

describe("SettingsDialog", () => {
  it("saves a valid key", async () => {
    const user = userEvent.setup();
    backend(null);
    render(<SettingsDialog open onOpenChange={() => {}} />);
    expect(await screen.findByTestId("tmdb-status")).toHaveTextContent("No key set");

    await user.type(keyInput(), "  valid  ");
    await user.click(screen.getByRole("button", { name: "Save key" }));

    expect(invokeMock).toHaveBeenCalledWith("set_tmdb_api_key", { key: "  valid  " });
    expect(await screen.findByTestId("tmdb-status")).toHaveTextContent("A TMDB key is saved.");
    expect(keyInput()).toHaveValue("");
  });

  it("shows TMDB's rejection and keeps the input", async () => {
    const user = userEvent.setup();
    backend(null);
    render(<SettingsDialog open onOpenChange={() => {}} />);

    await user.type(keyInput(), "typo");
    await user.click(screen.getByRole("button", { name: "Save key" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("TMDB rejected this key");
    expect(keyInput()).toHaveValue("typo");
  });

  it("disables save until a key is typed", async () => {
    backend(null);
    render(<SettingsDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Save key" })).toBeDisabled();
  });

  it("removes a saved key, falling back to the environment", async () => {
    const user = userEvent.setup();
    backend("saved");
    render(<SettingsDialog open onOpenChange={() => {}} />);

    await user.click(await screen.findByRole("button", { name: "Remove" }));

    expect(invokeMock).toHaveBeenCalledWith("clear_tmdb_api_key");
    expect(await screen.findByTestId("tmdb-status")).toHaveTextContent("No key set");
  });

  it("closes after saving on first run", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    backend(null);
    render(<SettingsDialog open firstRun onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog", { name: "Welcome to elcine" })).toBeInTheDocument();

    await user.type(keyInput(), "valid");
    await user.click(screen.getByRole("button", { name: "Save key" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
