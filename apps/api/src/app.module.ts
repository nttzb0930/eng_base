import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { AuthContextInterceptor } from "./auth/auth-context.interceptor";
import jwtConfig from "./config/jwt.config";

import { AdminModule } from "./module/admin/admin.module";
import { DashboardModule } from "./module/dashboard/dashboard.module";
import { CoursesModule } from "./module/courses/courses.module";
import { FlashcardsModule } from "./module/flashcards/flashcards.module";
import { PracticeModule } from "./module/practice/practice.module";
import { ReviewModule } from "./module/review/review.module";
import { TopicsModule } from "./module/topics/topics.module";
import { VocabularyModule } from "./module/vocabulary/vocabulary.module";
import { ProgressModule } from "./module/progress/progress.module";
import { PlacementTestModule } from "./module/placement-test/placement-test.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./module/auth/auth.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      load: [jwtConfig],
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    CoursesModule,
    FlashcardsModule,
    PracticeModule,
    ReviewModule,
    TopicsModule,
    VocabularyModule,
    ProgressModule,
    PlacementTestModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthContextInterceptor,
    },
  ],
})
export class AppModule {}

