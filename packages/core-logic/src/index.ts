/**
 * @sms/core-logic — framework-agnostic shared business logic.
 *
 * Single source of truth for IDs, schemas, pricing, and access rules across
 * the API, the desktop client, and the mobile client.
 *
 * Hard rule: this package must not import from any framework (NestJS, React,
 * Expo, Electron, or runtime-specific Node APIs).
 */

export const CORE_LOGIC_VERSION = "0.2.0";

// Utilities
export { newId } from "./utils/uuid.js";
export { termFromDate, type Term } from "./utils/date.js";

// Schemas
export { TenantSchema, type Tenant } from "./schemas/tenant.js";
export { UserSchema, UserRole, type User } from "./schemas/user.js";
export { StudentSchema, type Student } from "./schemas/student.js";
export { AccessTokenSchema, type AccessToken } from "./schemas/access.js";

// Rules
export {
  isAccessValid,
  accessDurationHours,
  priceKES,
  PASS_DURATION_HOURS,
  PRICE_KES,
  type Pass,
  type PricedRole,
} from "./rules/access.js";
