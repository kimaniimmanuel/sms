import { SetMetadata } from "@nestjs/common";

/**
 * Metadata key the global TenantGuard checks before applying tenant validation.
 * Exported so the guard and tests reference the same string.
 */
export const SKIP_TENANT_KEY = "skip-tenant";

/**
 * @SkipTenant() — marks a controller or handler as exempt from TenantGuard.
 *
 * Use sparingly. Reasonable opt-outs:
 *   - `/auth/refresh`, `/auth/logout` — no X-School-ID available
 *   - `/payments/callback` (Epic E9) — Daraja can't know about tenants
 *   - health and readiness probes
 *
 * Anything else should carry X-School-ID; multi-tenant isolation is the
 * headline security property of this API.
 */
export const SkipTenant = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_TENANT_KEY, true);
