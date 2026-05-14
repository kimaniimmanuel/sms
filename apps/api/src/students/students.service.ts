import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, type Repository } from "typeorm";
import { newId } from "@sms/core-logic";
import { Student } from "./student.entity.js";

export interface ListStudentsOpts {
  grade?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface ListStudentsResult {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStudentInput {
  name: string;
  grade: string;
  dateOfBirth?: string;
  guardianPhone?: string;
}

export interface UpdateStudentInput {
  name?: string;
  grade?: string;
  dateOfBirth?: string;
  guardianPhone?: string;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * StudentsService — owns student persistence.
 *
 * Every query is tenant-scoped: the `schoolId` parameter is part of the
 * WHERE clause, not optional metadata. An admin in Tenant A who somehow
 * obtains a student UUID from Tenant B will get 404, because the lookup
 * filters by both id AND schoolId.
 *
 * `archive` is a soft delete: `is_archived = true`. Default list queries
 * exclude archived rows; pass `includeArchived: true` to see them.
 */
@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly repo: Repository<Student>,
  ) {}

  async list(schoolId: string, opts: ListStudentsOpts = {}): Promise<ListStudentsResult> {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = Math.min(opts.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const where: Record<string, unknown> = { schoolId };
    if (!opts.includeArchived) where.isArchived = false;
    if (opts.grade) where.grade = opts.grade;
    if (opts.search) where.name = ILike(`%${opts.search}%`);

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async findById(id: string, schoolId: string): Promise<Student | null> {
    return this.repo.findOne({ where: { id, schoolId } });
  }

  async create(schoolId: string, input: CreateStudentInput): Promise<Student> {
    return this.repo.save(
      this.repo.create({
        id: newId(),
        schoolId,
        name: input.name,
        grade: input.grade,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        guardianPhone: input.guardianPhone ?? null,
        isArchived: false,
      }),
    );
  }

  async update(
    id: string,
    schoolId: string,
    input: UpdateStudentInput,
  ): Promise<Student> {
    const student = await this.findById(id, schoolId);
    if (!student) {
      throw new NotFoundException({
        code: "STUDENT_NOT_FOUND",
        message: "No student with that id in this tenant",
      });
    }
    if (input.name !== undefined) student.name = input.name;
    if (input.grade !== undefined) student.grade = input.grade;
    if (input.dateOfBirth !== undefined) {
      student.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    }
    if (input.guardianPhone !== undefined) {
      student.guardianPhone = input.guardianPhone || null;
    }
    return this.repo.save(student);
  }

  async archive(id: string, schoolId: string): Promise<Student> {
    const student = await this.findById(id, schoolId);
    if (!student) {
      throw new NotFoundException({
        code: "STUDENT_NOT_FOUND",
        message: "No student with that id in this tenant",
      });
    }
    if (!student.isArchived) {
      student.isArchived = true;
      await this.repo.save(student);
    }
    return student;
  }
}
