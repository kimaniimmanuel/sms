import { Controller, Get } from "@nestjs/common";
import { SkipTenant } from "../common/decorators/skip-tenant.decorator.js";

@SkipTenant()
@Controller()
export class HealthController {
  @Get("health")
  health() {
    return { status: "ok", service: "sms-api", time: new Date().toISOString() };
  }
}
