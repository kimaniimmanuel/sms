import "reflect-metadata";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import {
  AuthService,
  hashToken,
  parseExpiryToSeconds,
} from "./auth.service.js";
import type { PasswordService } from "./password.service.js";
import type { User } from "../users/user.entity.js";
import type { RefreshToken } from "./refresh-token.entity.js";

// --- minimal stubs ---------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    schoolId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01",
    name: "John Otieno",
    phone: "+254712345678",
    email: null,
    role: "teacher",
    passwordHash: "irrelevant-here",
    deviceId: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  } as User;
}

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";
const USER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02";

function makeService(opts: {
  user?: User | null;
  refreshRow?: Partial<RefreshToken> | null;
  passwordValid?: boolean;
} = {}) {
  const users = {
    findByPhoneAndSchool: jest.fn().mockResolvedValue(opts.user ?? null),
    findById: jest.fn().mockResolvedValue(opts.user ?? null),
  };
  const passwords = {
    compare: jest.fn().mockResolvedValue(opts.passwordValid ?? true),
    hash: jest.fn().mockResolvedValue("hashed"),
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed.jwt.value"),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === "JWT_ACCESS_EXPIRY") return "15m";
      if (key === "JWT_REFRESH_EXPIRY") return "7d";
      return undefined;
    }),
  };
  const inserts: Array<Record<string, unknown>> = [];
  const saved: Array<Record<string, unknown>> = [];
  const refreshRepo = {
    findOne: jest.fn().mockResolvedValue(opts.refreshRow ?? null),
    insert: jest.fn((row: Record<string, unknown>) => {
      inserts.push(row);
      return Promise.resolve({ identifiers: [{ id: row.id }] });
    }),
    save: jest.fn((row: Record<string, unknown>) => {
      saved.push(row);
      return Promise.resolve(row);
    }),
  };
  const svc = new AuthService(
    users as never,
    passwords as unknown as PasswordService,
    jwt as never,
    config as never,
    refreshRepo as never,
  );
  return { svc, users, passwords, jwt, config, refreshRepo, inserts, saved };
}

// --- tests -----------------------------------------------------------------

describe("AuthService.login", () => {
  it("returns tokens on valid credentials and persists the refresh row", async () => {
    const user = makeUser();
    const ctx = makeService({ user, passwordValid: true });
    const result = await ctx.svc.login(SCHOOL_ID, user.phone, "secret");

    expect(result.accessToken).toBe("signed.jwt.value");
    expect(typeof result.refreshToken).toBe("string");
    expect(result.refreshToken.length).toBeGreaterThanOrEqual(64);
    expect(result.user).toEqual({
      id: user.id,
      schoolId: user.schoolId,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
    expect(result.expiresIn).toBe(15 * 60);
    expect(ctx.refreshRepo.insert).toHaveBeenCalledTimes(1);
    const inserted = ctx.inserts[0]!;
    expect(inserted.tokenHash).toBe(hashToken(result.refreshToken));
    expect(inserted.userId).toBe(user.id);
    expect(inserted.schoolId).toBe(user.schoolId);
  });

  it("rejects with UnauthorizedException when the user is unknown", async () => {
    const ctx = makeService({ user: null });
    await expect(
      ctx.svc.login(SCHOOL_ID, "+254712345678", "secret"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.refreshRepo.insert).not.toHaveBeenCalled();
  });

  it("rejects when the user is inactive (even with valid password)", async () => {
    const user = makeUser({ isActive: false });
    const ctx = makeService({ user, passwordValid: true });
    await expect(
      ctx.svc.login(SCHOOL_ID, user.phone, "secret"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects with UnauthorizedException when the password is wrong", async () => {
    const user = makeUser();
    const ctx = makeService({ user, passwordValid: false });
    await expect(
      ctx.svc.login(SCHOOL_ID, user.phone, "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("records the supplied deviceId on the refresh row when given", async () => {
    const user = makeUser();
    const ctx = makeService({ user, passwordValid: true });
    await ctx.svc.login(SCHOOL_ID, user.phone, "secret", "device-XYZ");
    expect(ctx.inserts[0]!.deviceId).toBe("device-XYZ");
  });
});

describe("AuthService.refresh", () => {
  const baseRow = (overrides: Partial<RefreshToken> = {}) =>
    ({
      id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8b01",
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      tokenHash: hashToken("token-A"),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      deviceId: null,
      revokedAt: null,
      createdAt: new Date(),
      ...overrides,
    }) as RefreshToken;

  it("rotates the refresh token and returns a fresh pair", async () => {
    const user = makeUser();
    const row = baseRow();
    const ctx = makeService({ user, refreshRow: row });
    const result = await ctx.svc.refresh("token-A");

    expect(result.accessToken).toBe("signed.jwt.value");
    expect(result.refreshToken).not.toBe("token-A");
    expect(
      ctx.saved.some((r) => (r as unknown as RefreshToken).revokedAt instanceof Date),
    ).toBe(true);
    expect(ctx.refreshRepo.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects when no matching refresh row exists", async () => {
    const ctx = makeService({ user: makeUser(), refreshRow: null });
    await expect(ctx.svc.refresh("nope")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the row is already revoked", async () => {
    const row = baseRow({ revokedAt: new Date() });
    const ctx = makeService({ user: makeUser(), refreshRow: row });
    await expect(ctx.svc.refresh("token-A")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the row is expired", async () => {
    const row = baseRow({ expiresAt: new Date(Date.now() - 1000) });
    const ctx = makeService({ user: makeUser(), refreshRow: row });
    await expect(ctx.svc.refresh("token-A")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the user has been deactivated since the token was issued", async () => {
    const row = baseRow();
    const ctx = makeService({ user: makeUser({ isActive: false }), refreshRow: row });
    await expect(ctx.svc.refresh("token-A")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.logout", () => {
  const baseRow = (_overrides: Partial<RefreshToken> = {}) =>
    ({
      id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8b01",
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      tokenHash: hashToken("token-A"),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      revokedAt: null,
      createdAt: new Date(),
    }) as RefreshToken;

  it("marks the refresh token revoked", async () => {
    const row = baseRow();
    const ctx = makeService({ refreshRow: row });
    await ctx.svc.logout("token-A", USER_ID);
    expect(ctx.saved).toHaveLength(1);
    expect((ctx.saved[0] as unknown as RefreshToken).revokedAt).toBeInstanceOf(Date);
  });

  it("is idempotent — already-revoked token does not re-save", async () => {
    const row = { ...baseRow(), revokedAt: new Date() } as RefreshToken;
    const ctx = makeService({ refreshRow: row });
    await ctx.svc.logout("token-A", USER_ID);
    expect(ctx.saved).toHaveLength(0);
  });

  it("is a no-op for an unknown token (silently succeeds)", async () => {
    const ctx = makeService({ refreshRow: null });
    await expect(ctx.svc.logout("nope", USER_ID)).resolves.toBeUndefined();
    expect(ctx.saved).toHaveLength(0);
  });

  it("rejects when the token belongs to a different user", async () => {
    const row = baseRow();
    const ctx = makeService({ refreshRow: row });
    await expect(ctx.svc.logout("token-A", "different-user-id")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe("hashToken", () => {
  it("returns a 64-char hex SHA-256 digest", () => {
    expect(hashToken("anything")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashToken("x")).toBe(hashToken("x"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("parseExpiryToSeconds", () => {
  it.each([
    ["30s", 30],
    ["15m", 900],
    ["1h", 3600],
    ["7d", 604800],
    ["120", 120],
  ])("'%s' → %i", (input, expected) => {
    expect(parseExpiryToSeconds(input)).toBe(expected);
  });
});
