import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./module/auth";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { HttpLoggingInterceptor } from "./common/interceptors/http-logging.interceptor";
import { LoggingModule } from "./common/logging";
import { jwtConfig, validateEnvironment } from "./config";

import { UserModule } from "./module/user";
import { SettingsModule } from "./module/settings";
import { DashboardModule } from "./module/dashboard";
import { CoursesModule } from "./module/courses";
import { FlashcardsModule } from "./module/flashcards";
import { PracticeModule } from "./module/practice";
import { ReviewModule } from "./module/review";
import { TopicsModule } from "./module/topics/topics.module";
import { VocabularyModule } from "./module/vocabulary";
import { ProgressModule } from "./module/progress";
import { PlacementTestModule } from "./module/placement-test";
import { PrismaModule } from "./database/prisma/prisma.module";
import { HealthModule } from "./module/health";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      validate: validateEnvironment,
      load: [jwtConfig],
    }),
    PrismaModule,
    LoggingModule,
    AuthModule,
    UserModule,
    SettingsModule,
    DashboardModule,
    CoursesModule,
    FlashcardsModule,
    PracticeModule,
    ReviewModule,
    TopicsModule,
    VocabularyModule,
    ProgressModule,
    PlacementTestModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
