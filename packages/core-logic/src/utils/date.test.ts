import { termFromDate, type Term } from "./date.js";

describe("termFromDate", () => {
  // Boundary days across each term.
  const cases: Array<[string, Term]> = [
    ["2026-01-01", "term1"],
    ["2026-02-15", "term1"],
    ["2026-03-31", "term1"],
    ["2026-04-30", "term1"],
    ["2026-05-01", "term2"],
    ["2026-06-15", "term2"],
    ["2026-07-31", "term2"],
    ["2026-08-31", "term2"],
    ["2026-09-01", "term3"],
    ["2026-10-15", "term3"],
    ["2026-11-30", "term3"],
    ["2026-12-31", "term3"],
  ];

  it.each(cases)("%s falls in %s", (iso, expected) => {
    expect(termFromDate(new Date(iso))).toBe(expected);
  });

  it("returns one of the three valid term values", () => {
    const valid: Term[] = ["term1", "term2", "term3"];
    for (let m = 0; m < 12; m++) {
      const result = termFromDate(new Date(Date.UTC(2026, m, 15)));
      expect(valid).toContain(result);
    }
  });
});
