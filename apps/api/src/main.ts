import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown body fields
      forbidNonWhitelisted: true, // 400 on unknown fields
      transform: true,
    }),
  );

  app.enableCors({ origin: true, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SMS API")
    .setDescription("School Management System — multi-tenant API")
    .setVersion("0.1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "jwt")
    .addGlobalParameters({
      name: "X-School-ID",
      in: "header",
      required: false,
      schema: { type: "string", format: "uuid" },
      description: "Tenant UUID. Required on all routes except @SkipTenant ones.",
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Apply bearer auth as the default security for every operation. Public
  // routes (login, refresh, health) still work — the server ignores the token.
  document.security = [{ jwt: [] }];
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.info(`SMS API listening on http://localhost:${port}`);
  console.info(`Swagger UI:           http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
