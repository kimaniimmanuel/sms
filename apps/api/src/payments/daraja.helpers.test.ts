import {
  buildStkPassword,
  formatStkTimestamp,
  getMetadataItem,
  normalizeKenyanPhone,
} from "./daraja.helpers.js";

describe("formatStkTimestamp", () => {
  it("formats to YYYYMMDDHHMMSS in Africa/Nairobi (UTC+3)", () => {
    // 08:00 UTC = 11:00 Nairobi
    expect(formatStkTimestamp(new Date("2026-05-15T08:00:00Z"))).toBe("20260515110000");
  });

  it("rolls the date when UTC time pushes Nairobi past midnight", () => {
    // 23:30 UTC on May 14 = 02:30 Nairobi on May 15
    expect(formatStkTimestamp(new Date("2026-05-14T23:30:00Z"))).toBe("20260515023000");
  });

  it("returns exactly 14 digits", () => {
    expect(formatStkTimestamp(new Date())).toMatch(/^\d{14}$/);
  });
});

describe("buildStkPassword", () => {
  it("is base64(shortcode + passkey + timestamp)", () => {
    const pw = buildStkPassword("174379", "abc", "20260515110000");
    const decoded = Buffer.from(pw, "base64").toString("utf8");
    expect(decoded).toBe("174379abc20260515110000");
  });

  it("is deterministic for identical inputs", () => {
    expect(buildStkPassword("174379", "x", "t")).toBe(buildStkPassword("174379", "x", "t"));
  });
});

describe("normalizeKenyanPhone", () => {
  it.each([
    ["+254712345678", "254712345678"],
    ["0712345678", "254712345678"],
    ["254712345678", "254712345678"],
    ["712345678", "254712345678"],
    ["+254 712 345 678", "254712345678"], // spaces stripped
    ["0112345678", "254112345678"], // Safaricom 01x prefix
  ])("%s → %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["abc", "12", "+1234567890"])("rejects clearly-invalid %s", (input) => {
    expect(() => normalizeKenyanPhone(input)).toThrow();
  });
});

describe("getMetadataItem", () => {
  const items = [
    { Name: "Amount", Value: 10 },
    { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
    { Name: "PhoneNumber", Value: 254712345678 },
  ];

  it("returns the value for a matching name", () => {
    expect(getMetadataItem(items, "MpesaReceiptNumber")).toBe("NLJ7RT61SV");
    expect(getMetadataItem(items, "Amount")).toBe(10);
  });

  it("returns undefined when name is not present", () => {
    expect(getMetadataItem(items, "Nope")).toBeUndefined();
  });
});
