import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { applicationConfig } from "./config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const application = app.get<ConfigType<typeof applicationConfig>>(
    applicationConfig.KEY
  );
  if (application.trustProxyHops > 0) {
    app
      .getHttpAdapter()
      .getInstance()
      .set("trust proxy", application.trustProxyHops);
  }

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: application.corsOrigins,
    exposedHeaders: ["Content-Range", "X-Request-Id"],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  await app.listen(application.port);
}

void bootstrap();
