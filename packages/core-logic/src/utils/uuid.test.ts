import { newId } from "./uuid.js";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  it("returns a string matching the UUID v7 canonical format", () => {
    expect(newId()).toMatch(UUID_V7_REGEX);
  });

  it("returns lowercase output (no uppercase hex)", () => {
    const id = newId();
    expect(id).toBe(id.toLowerCase());
  });

  it("sets the version nibble to 7", () => {
    expect(newId().charAt(14)).toBe("7");
  });

  it("sets the variant bits (first char of 4th group ∈ {8,9,a,b})", () => {
    const id = newId();
    expect(["8", "9", "a", "b"]).toContain(id.charAt(19));
  });

  it("produces 10,000 unique IDs in a single batch", () => {
    const set = new Set<string>();
    for (let i = 0; i < 10000; i++) set.add(newId());
    expect(set.size).toBe(10000);
  });

  it("is time-ordered: IDs separated by a millisecond sort in creation order", async () => {
    const t0 = newId();
    await new Promise((resolve) => setTimeout(resolve, 2));
    const t1 = newId();
    expect(t1 > t0).toBe(true);
  });
});
