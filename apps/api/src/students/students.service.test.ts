import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { ILike } from "typeorm";
import { StudentsService } from "./students.service.js";

function setup(opts: {
  found?: unknown;
  rows?: unknown[];
  total?: number;
  saveImpl?: jest.Mock;
} = {}) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(opts.found ?? null),
    findAndCount: jest.fn().mockResolvedValue([opts.rows ?? [], opts.total ?? 0]),
    create: jest.fn((data: unknown) => data),
    save: opts.saveImpl ?? jest.fn((data: unknown) => Promise.resolve(data)),
  };
  const svc = new StudentsService(repo as never);
  return { svc, repo };
}

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a01";
const OTHER_SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a99";
const STUDENT_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1c8b01";

describe("StudentsService.list", () => {
  it("queries by schoolId, excludes archived by default, paginates", async () => {
    const { svc, repo } = setup({ rows: [], total: 0 });
    const result = await svc.list(SCHOOL_ID);

    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID, isArchived: false },
      order: { createdAt: "DESC" },
      skip: 0,
      take: 50,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("applies grade filter when provided", async () => {
    const { svc, repo } = setup();
    await svc.list(SCHOOL_ID, { grade: "Grade 4" });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: SCHOOL_ID, isArchived: false, grade: "Grade 4" },
      }),
    );
  });

  it("applies case-insensitive search via ILike", async () => {
    const { svc, repo } = setup();
    await svc.list(SCHOOL_ID, { search: "mary" });
    const call = repo.findAndCount.mock.calls[0]![0]!;
    expect(call.where.name).toEqual(ILike("%mary%"));
  });

  it("respects includeArchived=true", async () => {
    const { svc, repo } = setup();
    await svc.list(SCHOOL_ID, { includeArchived: true });
    const call = repo.findAndCount.mock.calls[0]![0]!;
    expect(call.where).not.toHaveProperty("isArchived");
  });

  it("clamps pageSize to MAX_PAGE_SIZE (200)", async () => {
    const { svc, repo } = setup();
    await svc.list(SCHOOL_ID, { pageSize: 9999 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it("rejects nonsensical page values by snapping to page 1", async () => {
    const { svc, repo } = setup();
    await svc.list(SCHOOL_ID, { page: -5 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });
});

describe("StudentsService.findById", () => {
  it("queries by id AND schoolId (tenant scoping is defence-in-depth)", async () => {
    const student = { id: STUDENT_ID, schoolId: SCHOOL_ID };
    const { svc, repo } = setup({ found: student });
    await expect(svc.findById(STUDENT_ID, SCHOOL_ID)).resolves.toBe(student);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: STUDENT_ID, schoolId: SCHOOL_ID },
    });
  });

  it("returns null when a student exists but belongs to a different tenant", async () => {
    const { svc, repo } = setup({ found: null });
    await expect(svc.findById(STUDENT_ID, OTHER_SCHOOL_ID)).resolves.toBeNull();
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: STUDENT_ID, schoolId: OTHER_SCHOOL_ID },
    });
  });
});

describe("StudentsService.create", () => {
  const baseInput = { name: "Mary Wanjiku", grade: "Grade 4" };

  it("assigns a fresh UUID v7 and schoolId from the argument", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => ({
      ...data,
      createdAt: new Date(),
    }));
    const { svc } = setup({ saveImpl: saveMock });
    const result = await svc.create(SCHOOL_ID, baseInput);

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.schoolId).toBe(SCHOOL_ID);
    expect(result.isArchived).toBe(false);
  });

  it("nullifies missing optional fields explicitly", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const { svc } = setup({ saveImpl: saveMock });
    await svc.create(SCHOOL_ID, baseInput);
    const saved = saveMock.mock.calls[0]![0]!;
    expect(saved.dateOfBirth).toBeNull();
    expect(saved.guardianPhone).toBeNull();
  });

  it("parses dateOfBirth from ISO string", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const { svc } = setup({ saveImpl: saveMock });
    await svc.create(SCHOOL_ID, { ...baseInput, dateOfBirth: "2015-04-10" });
    const saved = saveMock.mock.calls[0]![0]!;
    expect(saved.dateOfBirth).toBeInstanceOf(Date);
  });
});

describe("StudentsService.update", () => {
  const existing = {
    id: STUDENT_ID,
    schoolId: SCHOOL_ID,
    name: "Old Name",
    grade: "Grade 3",
    dateOfBirth: null,
    guardianPhone: null,
    isArchived: false,
    createdAt: new Date(),
  };

  it("throws 404 when student is missing in this tenant", async () => {
    const { svc } = setup({ found: null });
    await expect(svc.update(STUDENT_ID, SCHOOL_ID, { name: "x" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("partial update only touches supplied fields", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const { svc } = setup({ found: { ...existing }, saveImpl: saveMock });
    await svc.update(STUDENT_ID, SCHOOL_ID, { name: "New Name" });
    const saved = saveMock.mock.calls[0]![0]!;
    expect(saved.name).toBe("New Name");
    expect(saved.grade).toBe("Grade 3"); // untouched
  });

  it("can clear guardianPhone via empty string", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const start = { ...existing, guardianPhone: "+254700000099" };
    const { svc } = setup({ found: start, saveImpl: saveMock });
    await svc.update(STUDENT_ID, SCHOOL_ID, { guardianPhone: "" });
    expect(saveMock.mock.calls[0]![0]!.guardianPhone).toBeNull();
  });
});

describe("StudentsService.archive", () => {
  it("throws 404 when student is missing in this tenant", async () => {
    const { svc } = setup({ found: null });
    await expect(svc.archive(STUDENT_ID, SCHOOL_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("sets isArchived=true and saves", async () => {
    const saveMock = jest.fn(async (data: Record<string, unknown>) => data);
    const found = { id: STUDENT_ID, schoolId: SCHOOL_ID, isArchived: false };
    const { svc } = setup({ found, saveImpl: saveMock });
    const result = await svc.archive(STUDENT_ID, SCHOOL_ID);
    expect(result.isArchived).toBe(true);
    expect(saveMock).toHaveBeenCalled();
  });

  it("is idempotent — already-archived student does not re-save", async () => {
    const saveMock = jest.fn();
    const found = { id: STUDENT_ID, schoolId: SCHOOL_ID, isArchived: true };
    const { svc } = setup({ found, saveImpl: saveMock });
    await svc.archive(STUDENT_ID, SCHOOL_ID);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
