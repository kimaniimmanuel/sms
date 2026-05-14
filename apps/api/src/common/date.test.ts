import { KENYA_TZ, todayInTimeZone } from "./date.js";

describe("todayInTimeZone", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayInTimeZone(KENYA_TZ)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("respects the timezone — Nairobi is 3h ahead of UTC", () => {
    // 22:00 UTC on May 15 → 01:00 Nairobi on May 16
    const moment = new Date("2026-05-15T22:00:00Z");
    expect(todayInTimeZone("UTC", moment)).toBe("2026-05-15");
    expect(todayInTimeZone(KENYA_TZ, moment)).toBe("2026-05-16");
  });

  it("agrees with UTC during the middle of a UTC day", () => {
    // 12:00 UTC on May 15 → 15:00 Nairobi on May 15 — same date
    const moment = new Date("2026-05-15T12:00:00Z");
    expect(todayInTimeZone("UTC", moment)).toBe("2026-05-15");
    expect(todayInTimeZone(KENYA_TZ, moment)).toBe("2026-05-15");
  });

  it("KENYA_TZ is Africa/Nairobi", () => {
    expect(KENYA_TZ).toBe("Africa/Nairobi");
  });
});
