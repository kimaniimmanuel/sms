import "reflect-metadata";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AttendanceService, aggregateGradeRows } from "./attendance.service.js";

const SCHOOL_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1d9001";
const TEACHER_ID = "01959be0-7d3a-7a4f-9b27-2d5a9f1d9002";
const STUDENT_1 = "01959be0-7d3a-7a4f-9b27-2d5a9f1d9101";
const STUDENT_2 = "01959be0-7d3a-7a4f-9b27-2d5a9f1d9102";

// Today is 2026-05-15 in the prototype's clock; we inject a fixed `now`.
const NOW = new Date("2026-05-15T10:00:00Z"); // ~13:00 Nairobi
const TODAY = "2026-05-15";
const YESTERDAY = "2026-05-14";
const TOMORROW = "2026-05-16";

function setup(
  opts: {
    existing?: unknown[];
    studentCount?: number;
    upsertImpl?: jest.Mock;
  } = {},
) {
  const repo = {
    find: jest.fn().mockResolvedValue(opts.existing ?? []),
    findAndCount: jest.fn(),
    upsert: opts.upsertImpl ?? jest.fn().mockResolvedValue({ identifiers: [] }),
    createQueryBuilder: jest.fn(),
  };
  const studentsRepo = {
    count: jest.fn().mockResolvedValue(opts.studentCount ?? 0),
  };
  const svc = new AttendanceService(repo as never, studentsRepo as never);
  return { svc, repo, studentsRepo };
}

describe("AttendanceService.bulkSubmit", () => {
  const todayEntries = [
    { studentId: STUDENT_1, date: TODAY, status: "present" as const },
    { studentId: STUDENT_2, date: TODAY, status: "absent" as const },
  ];

  it("rejects future-dated entries with 400 ATT_FUTURE_DATE", async () => {
    const { svc } = setup({ studentCount: 2 });
    const entries = [{ studentId: STUDENT_1, date: TOMORROW, status: "present" as const }];
    await expect(svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, entries, NOW)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("allows past-dated entries when no row exists (offline sync of yesterday)", async () => {
    const { svc, repo } = setup({
      existing: [], // no existing rows for the past date
      studentCount: 1, // one unique student in the entries below
    });
    const entries = [{ studentId: STUDENT_1, date: YESTERDAY, status: "present" as const }];
    await svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, entries, NOW);
    expect(repo.upsert).toHaveBeenCalled();
  });

  it("rejects past-dated entries when a row already exists (403 ATT_EDIT_WINDOW_CLOSED)", async () => {
    const { svc } = setup({
      existing: [{ studentId: STUDENT_1, date: YESTERDAY }],
      studentCount: 1,
    });
    const entries = [{ studentId: STUDENT_1, date: YESTERDAY, status: "absent" as const }];
    await expect(svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, entries, NOW)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("rejects when one or more studentIds do not belong to this tenant", async () => {
    const { svc } = setup({ studentCount: 1 }); // 2 sent, only 1 found
    await expect(svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, todayEntries, NOW)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("upserts on (studentId, date) when all checks pass", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ identifiers: [] });
    const { svc } = setup({ studentCount: 2, upsertImpl: upsertMock });
    const result = await svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, todayEntries, NOW);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, conflictCols] = upsertMock.mock.calls[0]!;
    expect(conflictCols).toEqual(["studentId", "date"]);
    expect(payload).toHaveLength(2);
    expect(payload[0].schoolId).toBe(SCHOOL_ID);
    expect(payload[0].teacherId).toBe(TEACHER_ID);
    expect(payload[0].syncedAt).toBeInstanceOf(Date);
    expect(payload[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    expect(result.count).toBe(2);
    expect(result.schoolId).toBe(SCHOOL_ID);
    expect(result.teacherId).toBe(TEACHER_ID);
  });

  it("deduplicates studentIds for the existence check (avoids N queries for the same student)", async () => {
    const { svc, studentsRepo } = setup({ studentCount: 1 });
    const entries = [
      { studentId: STUDENT_1, date: TODAY, status: "present" as const },
      { studentId: STUDENT_1, date: YESTERDAY, status: "absent" as const }, // same student, different date
    ];
    // studentCount=1 means the dedup-count check passes (1 unique id, 1 found)
    try {
      await svc.bulkSubmit(SCHOOL_ID, TEACHER_ID, entries, NOW);
    } catch {
      // edit-window may still throw; we only care that count was called with deduped ids
    }
    const countCall = studentsRepo.count.mock.calls[0]![0]!;
    // In() wraps the ids; we just check the count of unique values made it through
    expect(Array.isArray(countCall.where.id._value)).toBe(true);
    expect(countCall.where.id._value).toEqual([STUDENT_1]);
  });
});

describe("AttendanceService.list", () => {
  it("queries by schoolId with default pagination", async () => {
    const repo = {
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const studentsRepo = { count: jest.fn() };
    const svc = new AttendanceService(repo as never, studentsRepo as never);

    const result = await svc.list(SCHOOL_ID);
    expect(repo.findAndCount).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID },
      order: { date: "DESC", createdAt: "DESC" },
      skip: 0,
      take: 50,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("applies optional filters when provided", async () => {
    const repo = {
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const studentsRepo = { count: jest.fn() };
    const svc = new AttendanceService(repo as never, studentsRepo as never);

    await svc.list(SCHOOL_ID, {
      date: TODAY,
      studentId: STUDENT_1,
      teacherId: TEACHER_ID,
      status: "absent",
      page: 2,
      pageSize: 10,
    });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          schoolId: SCHOOL_ID,
          date: TODAY,
          studentId: STUDENT_1,
          teacherId: TEACHER_ID,
          status: "absent",
        },
        skip: 10,
        take: 10,
      }),
    );
  });
});

describe("aggregateGradeRows", () => {
  it("folds raw rows into byGrade and totals", () => {
    const summary = aggregateGradeRows("2026-05-15", [
      { grade: "Grade 4", status: "present", count: 18 },
      { grade: "Grade 4", status: "absent", count: 1 },
      { grade: "Grade 4", status: "late", count: 2 },
      { grade: "Grade 5", status: "present", count: 15 },
      { grade: "Grade 5", status: "late", count: 1 },
    ]);

    expect(summary.date).toBe("2026-05-15");
    expect(summary.byGrade).toHaveLength(2);
    expect(summary.byGrade[0]).toEqual({
      grade: "Grade 4",
      present: 18,
      absent: 1,
      late: 2,
      total: 21,
    });
    expect(summary.byGrade[1]).toEqual({
      grade: "Grade 5",
      present: 15,
      absent: 0,
      late: 1,
      total: 16,
    });
    expect(summary.totals).toEqual({
      present: 33,
      absent: 1,
      late: 3,
      total: 37,
    });
  });

  it("returns an empty summary when no rows are present", () => {
    const summary = aggregateGradeRows("2026-05-15", []);
    expect(summary.byGrade).toEqual([]);
    expect(summary.totals).toEqual({ present: 0, absent: 0, late: 0, total: 0 });
  });

  it("sorts byGrade alphabetically", () => {
    const summary = aggregateGradeRows("2026-05-15", [
      { grade: "Grade 5", status: "present", count: 1 },
      { grade: "Grade 4", status: "present", count: 1 },
      { grade: "Grade 6", status: "present", count: 1 },
    ]);
    expect(summary.byGrade.map((g) => g.grade)).toEqual(["Grade 4", "Grade 5", "Grade 6"]);
  });
});
