import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { newId } from "@sms/core-logic";
import { Attendance } from "./attendance.entity.js";
import { Student } from "../students/student.entity.js";
import { KENYA_TZ, todayInTimeZone } from "../common/date.js";

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceEntryInput {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface BulkSubmitResult {
  count: number;
  schoolId: string;
  teacherId: string;
}

export interface ListAttendanceOpts {
  date?: string;
  studentId?: string;
  teacherId?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}

export interface ListAttendanceResult {
  items: Attendance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GradeBreakdown {
  grade: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface DailySummary {
  date: string;
  byGrade: GradeBreakdown[];
  totals: { present: number; absent: number; late: number; total: number };
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

/**
 * AttendanceService — bulk-submit, list, and daily summary.
 *
 * Edit-window rules (FR-ATT-003):
 *   - today (Africa/Nairobi)              → unrestricted upsert
 *   - past dates + row doesn't exist yet  → allowed (offline sync of yesterday)
 *   - past dates + row already exists     → 403 ATT_EDIT_WINDOW_CLOSED
 *   - future dates                        → 400 (client clock skew or bug)
 *
 * Upsert idempotency comes from the composite unique index on (student_id, date)
 * applied in migration 1778716800003 — re-submitting identical rows is safe.
 */
@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly repo: Repository<Attendance>,
    @InjectRepository(Student)
    private readonly studentsRepo: Repository<Student>,
  ) {}

  async bulkSubmit(
    schoolId: string,
    teacherId: string,
    entries: AttendanceEntryInput[],
    now: Date = new Date(),
  ): Promise<BulkSubmitResult> {
    const today = todayInTimeZone(KENYA_TZ, now);

    // 1. Reject future dates entirely — almost always a bug or clock skew.
    const future = entries.filter((e) => e.date > today);
    if (future.length > 0) {
      throw new BadRequestException({
        code: "ATT_FUTURE_DATE",
        message: "Cannot record attendance for future dates",
      });
    }

    // 2. Edit-window: past-date entries are only allowed if no row exists yet
    // for that (student, date) pair. An UPDATE to a past day requires admin
    // override (P1 — not in prototype scope).
    const pastEntries = entries.filter((e) => e.date < today);
    if (pastEntries.length > 0) {
      const existing = await this.repo.find({
        where: pastEntries.map((e) => ({
          schoolId,
          studentId: e.studentId,
          date: e.date,
        })),
        select: { studentId: true, date: true },
      });
      if (existing.length > 0) {
        throw new ForbiddenException({
          code: "ATT_EDIT_WINDOW_CLOSED",
          message: "Cannot edit attendance for past dates; admin override required",
        });
      }
    }

    // 3. Validate every studentId belongs to this tenant — defends against an
    // authenticated user smuggling another tenant's student id into the body.
    const studentIds = Array.from(new Set(entries.map((e) => e.studentId)));
    const knownCount = await this.studentsRepo.count({
      where: { schoolId, id: In(studentIds) },
    });
    if (knownCount !== studentIds.length) {
      throw new BadRequestException({
        code: "INVALID_STUDENT_IDS",
        message: "One or more student IDs do not belong to this tenant",
      });
    }

    // 4. Upsert. Postgres ON CONFLICT (student_id, date) DO UPDATE — the
    // existing row keeps its id; status/note/teacher_id/synced_at refresh.
    const syncedAt = now;
    await this.repo.upsert(
      entries.map((e) => ({
        id: newId(),
        schoolId,
        studentId: e.studentId,
        teacherId,
        date: e.date,
        status: e.status,
        note: e.note ?? null,
        syncedAt,
      })),
      ["studentId", "date"],
    );

    return { count: entries.length, schoolId, teacherId };
  }

  async list(schoolId: string, opts: ListAttendanceOpts = {}): Promise<ListAttendanceResult> {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = Math.min(opts.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const where: Record<string, unknown> = { schoolId };
    if (opts.date) where.date = opts.date;
    if (opts.studentId) where.studentId = opts.studentId;
    if (opts.teacherId) where.teacherId = opts.teacherId;
    if (opts.status) where.status = opts.status;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { date: "DESC", createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async dailySummary(
    schoolId: string,
    date?: string,
    now: Date = new Date(),
  ): Promise<DailySummary> {
    const targetDate = date ?? todayInTimeZone(KENYA_TZ, now);

    // Raw SQL via TypeORM to JOIN attendance and students for grade.
    const rows = await this.repo
      .createQueryBuilder("a")
      .select("s.grade", "grade")
      .addSelect("a.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .innerJoin(Student, "s", "s.id = a.student_id")
      .where("a.school_id = :schoolId", { schoolId })
      .andWhere("a.date = :date", { date: targetDate })
      .groupBy("s.grade")
      .addGroupBy("a.status")
      .orderBy("s.grade", "ASC")
      .getRawMany<{ grade: string; status: AttendanceStatus; count: number }>();

    return aggregateGradeRows(targetDate, rows);
  }
}

/**
 * Exported for direct unit testing. Folds raw `(grade, status, count)` rows
 * into the nested DailySummary shape, ensuring every grade has all three
 * status counts even when zero.
 */
export function aggregateGradeRows(
  date: string,
  rows: Array<{ grade: string; status: AttendanceStatus; count: number }>,
): DailySummary {
  const map = new Map<string, GradeBreakdown>();
  for (const row of rows) {
    let entry = map.get(row.grade);
    if (!entry) {
      entry = { grade: row.grade, present: 0, absent: 0, late: 0, total: 0 };
      map.set(row.grade, entry);
    }
    entry[row.status] = row.count;
    entry.total += row.count;
  }

  const byGrade = Array.from(map.values()).sort((a, b) => a.grade.localeCompare(b.grade));
  const totals = byGrade.reduce(
    (acc, g) => ({
      present: acc.present + g.present,
      absent: acc.absent + g.absent,
      late: acc.late + g.late,
      total: acc.total + g.total,
    }),
    { present: 0, absent: 0, late: 0, total: 0 },
  );

  return { date, byGrade, totals };
}
