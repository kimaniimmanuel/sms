import { StudentSchema } from "./student.js";

describe("StudentSchema", () => {
  const valid = {
    id: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a02",
    schoolId: "01959be0-7d3a-7a4f-9b27-2d5a9f1c8a03",
    name: "Mary Wanjiku",
    grade: "Grade 4",
    createdAt: new Date(),
  };

  it("parses a minimal valid student", () => {
    expect(() => StudentSchema.parse(valid)).not.toThrow();
  });

  it("defaults isArchived=false", () => {
    expect(StudentSchema.parse(valid).isArchived).toBe(false);
  });

  it("accepts optional dateOfBirth and guardianPhone", () => {
    expect(() =>
      StudentSchema.parse({
        ...valid,
        dateOfBirth: new Date("2015-04-10"),
        guardianPhone: "+254712345678",
      }),
    ).not.toThrow();
  });

  it("rejects missing schoolId", () => {
    const { schoolId: _, ...withoutSchoolId } = valid;
    expect(() =>
      StudentSchema.parse(withoutSchoolId as unknown as typeof valid),
    ).toThrow();
  });

  it("rejects empty grade", () => {
    expect(() => StudentSchema.parse({ ...valid, grade: "" })).toThrow();
  });

  it("rejects malformed guardianPhone", () => {
    expect(() =>
      StudentSchema.parse({ ...valid, guardianPhone: "0712345678" }),
    ).toThrow();
  });
});
