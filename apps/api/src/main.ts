import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
   
  console.info(`SMS API listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
   
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
