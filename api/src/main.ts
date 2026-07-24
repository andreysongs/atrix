import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") || true, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableShutdownHooks();
  const port = Number(process.env.PORT || 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`OLYMPUS AI API listening on http://0.0.0.0:${port}/api/v1`);
}

void bootstrap();
