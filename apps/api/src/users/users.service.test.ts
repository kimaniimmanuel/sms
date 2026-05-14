import "reflect-metadata";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
  function setup(found: unknown) {
    const repo = { findOne: jest.fn().mockResolvedValue(found) };
    const svc = new UsersService(repo as never);
    return { svc, repo };
  }

  describe("findByPhoneAndSchool", () => {
    it("queries with both phone and schoolId (composite uniqueness)", async () => {
      const user = { id: "u1", phone: "+254712345678", schoolId: "s1" };
      const { svc, repo } = setup(user);
      await expect(svc.findByPhoneAndSchool(user.phone, user.schoolId)).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { phone: user.phone, schoolId: user.schoolId },
      });
    });

    it("returns null when no user matches", async () => {
      const { svc } = setup(null);
      await expect(svc.findByPhoneAndSchool("+254712345678", "s1")).resolves.toBeNull();
    });
  });

  describe("findById", () => {
    it("queries by id", async () => {
      const user = { id: "u1" };
      const { svc, repo } = setup(user);
      await expect(svc.findById("u1")).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "u1" } });
    });

    it("returns null when no user matches", async () => {
      const { svc } = setup(null);
      await expect(svc.findById("missing")).resolves.toBeNull();
    });
  });
});
