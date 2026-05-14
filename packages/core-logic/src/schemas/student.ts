import { z } from "zod";

/**
 * Student — one row per enrolled pupil.
 *
 * `grade` is a free-form string (e.g. "Grade 4", "PP1", "Form 2") because the
 * Kenyan curriculum mixes CBC and 8-4-4 nomenclature, and schools sometimes
 * use their own labels. Validation is structural, not curricular.
 *
 * `isArchived` is the soft-delete flag — students are never hard-deleted to
 * preserve attendance and grading history.
 */
export const StudentSchema = z
  .object({
    id: z.string().uuid(),
    schoolId: z.string().uuid(),
    name: z.string().min(1).max(255),
    grade: z.string().min(1).max(50),
    dateOfBirth: z.coerce.date().optional(),
    guardianPhone: z
      .string()
      .regex(/^\+\d{6,15}$/, "guardianPhone must be E.164")
      .optional(),
    isArchived: z.boolean().default(false),
    createdAt: z.coerce.date(),
  })
  .strict();

export type Student = z.infer<typeof StudentSchema>;
