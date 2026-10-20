import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SORT, SortOption, compareMovies, loadSort, saveSort } from "./sort";
import { movie } from "@/test/fixtures";

const sorted = (movies: ReturnType<typeof movie>[], by: SortOption) =>
  [...movies].sort((a, b) => compareMovies(a, b, by)).map((m) => m.title);

describe("compareMovies", () => {
  const older = movie({ title: "Mirror", director: "Tarkovsky", created_at: "2026-01-01 00:00:00", release_year: 1975 });
  const newer = movie({ title: "Alien", director: "Scott", created_at: "2026-02-01 00:00:00", release_year: 1979 });
  const undated = movie({ title: "Zodiac", director: "Fincher", created_at: "2026-03-01 00:00:00", release_year: null });

  it.each<[SortOption, string[]]>([
    ["added-desc", ["Zodiac", "Alien", "Mirror"]],
    ["added-asc", ["Mirror", "Alien", "Zodiac"]],
    ["title-asc", ["Alien", "Mirror", "Zodiac"]],
    ["title-desc", ["Zodiac", "Mirror", "Alien"]],
    ["director-asc", ["Zodiac", "Alien", "Mirror"]],
    ["director-desc", ["Mirror", "Alien", "Zodiac"]],
  ])("%s", (by, expected) => {
    expect(sorted([older, newer, undated], by)).toEqual(expected);
  });

  it("sinks unknown release years to the bottom in both directions", () => {
    expect(sorted([undated, older, newer], "release-desc")).toEqual(["Alien", "Mirror", "Zodiac"]);
    expect(sorted([undated, newer, older], "release-asc")).toEqual(["Mirror", "Alien", "Zodiac"]);

    // Whole-list order can come out right by luck of the sort algorithm, so
    // pin the comparator itself from both sides.
    for (const by of ["release-desc", "release-asc"] as const) {
      expect(compareMovies(undated, older, by)).toBeGreaterThan(0);
      expect(compareMovies(older, undated, by)).toBeLessThan(0);
      expect(compareMovies(undated, { ...undated }, by)).toBe(0);
    }
  });
});

describe("loadSort / saveSort", () => {
  it("round-trips a saved sort", () => {
    saveSort("title-desc");
    expect(loadSort()).toBe("title-desc");
  });

  it("falls back to the default when nothing is stored", () => {
    expect(loadSort()).toBe(DEFAULT_SORT);
  });

  it("falls back to the default for a sort from an older build", () => {
    localStorage.setItem("elcine.sortBy", "rating-desc");
    expect(loadSort()).toBe(DEFAULT_SORT);
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(loadSort()).toBe(DEFAULT_SORT);
    expect(() => saveSort("title-asc")).not.toThrow();
    vi.restoreAllMocks();
  });
});
