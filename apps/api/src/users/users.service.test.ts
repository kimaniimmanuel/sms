import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { UsersService } from "./users.service.js";
import type { PasswordService } from "../auth/password.service.js";

function setup(opts: {
  found?: unknown;
  rows?: unknown[];
  saveImpl?: jest.Mock;
} = {}) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(opts.found ?? null),
    find: jest.fn().mockResolvedValue(opts.rows ?? []),
    create: jest.fn((data: unknown) => data),
    save: opts.saveImpl ?? jest.fn((data: unknown) => Promise.resolve(data)),
  };
  const passwords = {
    hash: jest.fn().mockResolvedValue("HASHED"),
    compare: jest.fn(),
  } as unknown as PasswordService;
  const svc = new UsersService(repo as never, passwords);
  return { svc, repo, passwords };
}

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";

describe("UsersService.findByPhoneAndSchool", () => {
  it("queries with both phone and schoolId", async () => {
    const user = { id: "u1", phone: "+254712345678", schoolId: SCHOOL_ID };
    const { svc, repo } = setup({ found: user });
    await expect(svc.findByPhoneAndSchool(user.phone, SCHOOL_ID)).resolves.toBe(user);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { phone: user.phone, schoolId: SCHOOL_ID },
    });
  });

  it("returns null when no match", async () => {
    const { svc } = setup({ found: null });
    await expect(svc.findByPhoneAndSchool("+254700000000", SCHOOL_ID)).resolves.toBeNull();
  });
});

describe("UsersService.findById", () => {
  it("queries by id", async () => {
    const user = { id: "u1" };
    const { svc, repo } = setup({ found: user });
    await expect(svc.findById("u1")).resolves.toBe(user);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "u1" } });
  });
});

describe("UsersService.listForSchool", () => {
  it("queries by schoolId, orders by createdAt DESC, and strips passwordHash", async () => {
    const rows = [
      {
        id: "u1",
        schoolId: SCHOOL_ID,
        name: "Mary",
        phone: "+254700000001",
        email: null,
        role: "admin",
        passwordHash: "SECRET",
        isActive: true,
        createdAt: new Date("2026-05-01"),
      },
    ];
    const { svc, repo } = setup({ rows });
    const result = await svc.listForSchool(SCHOOL_ID);
    expect(repo.find).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID },
      order: { createdAt: "DESC" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("passwordHash");
    expect(result[0]!.name).toBe("Mary");
  });

  it("returns an empty array when no users match", async () => {
    const { svc } = setup({ rows: [] });
    await expect(svc.listForSchool(SCHOOL_ID)).resolves.toEqual([]);
  });
});

describe("UsersService.create", () => {
  const validInput = {
    name: "John Otieno",
    phone: "+254712345678",
    role: "teacher" as const,
    password: "plaintext-pw",
  };

  it("hashes the password and persists the row", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => ({
      ...data,
      id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
      createdAt: new Date(),
    }));
    const { svc, passwords } = setup({ saveImpl: saveMock });
    const result = await svc.create(SCHOOL_ID, validInput);

    expect(passwords.hash).toHaveBeenCalledWith("plaintext-pw");
    expect(saveMock).toHaveBeenCalledTimes(1);
    const savedRow = saveMock.mock.calls[0]![0]!;
    expect(savedRow.passwordHash).toBe("HASHED");
    expect(savedRow.schoolId).toBe(SCHOOL_ID);
    expect(savedRow.role).toBe("teacher");
    expect(savedRow.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    expect(result).not.toHaveProperty("passwordHash");
    expect(result.name).toBe("John Otieno");
  });

  it("uses null when email is omitted", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const { svc } = setup({ saveImpl: saveMock });
    await svc.create(SCHOOL_ID, validInput);
    expect(saveMock.mock.calls[0]![0]!.email).toBeNull();
  });

  it("translates Postgres unique_violation (23505) into 409 ConflictException", async () => {
    const driverError = { code: "23505", constraint: "uq_users_school_phone" };
    const queryErr = new QueryFailedError("INSERT", [], new Error("dup"));
    (queryErr as unknown as { driverError: typeof driverError }).driverError = driverError;
    const saveMock = jest.fn().mockRejectedValueOnce(queryErr);
    const { svc } = setup({ saveImpl: saveMock });

    await expect(svc.create(SCHOOL_ID, validInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("re-throws non-unique errors unchanged", async () => {
    const otherErr = new Error("connection lost");
    const saveMock = jest.fn().mockRejectedValueOnce(otherErr);
    const { svc } = setup({ saveImpl: saveMock });
    await expect(svc.create(SCHOOL_ID, validInput)).rejects.toBe(otherErr);
  });
});
