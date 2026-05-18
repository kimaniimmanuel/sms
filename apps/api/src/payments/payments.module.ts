import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./payment.entity.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsGateway } from "./payments.gateway.js";
import { DarajaService } from "./daraja.service.js";
import { AccessTokensModule } from "../access-tokens/access-tokens.module.js";
import { UsersModule } from "../users/users.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    AccessTokensModule,
    // Needed by PaymentsService for phone lookup during initiate
    // and role lookup during callback handling.
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsGateway, DarajaService],
  exports: [PaymentsService, PaymentsGateway],
})
export class PaymentsModule {}
