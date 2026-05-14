import "reflect-metadata";
import { BCRYPT_COST, PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("BCRYPT_COST is at least 12 (NFR-SEC-002)", () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
  });

  it("hash() returns a string different from the plaintext", async () => {
    const hash = await svc.hash("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(hash.length).toBeGreaterThan(40);
  });

  it("hash() returns a different value on each call (random salt)", async () => {
    const [a, b] = await Promise.all([svc.hash("same"), svc.hash("same")]);
    expect(a).not.toBe(b);
  });

  it("hash() embeds the cost factor", async () => {
    const hash = await svc.hash("anything");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("compare() returns true for the matching plaintext", async () => {
    const hash = await svc.hash("correct horse battery staple");
    await expect(svc.compare("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("compare() returns false for a wrong plaintext", async () => {
    const hash = await svc.hash("right");
    await expect(svc.compare("wrong", hash)).resolves.toBe(false);
  });
});

jest.setTimeout(20000);
