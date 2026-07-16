import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { AuthContextInterceptor, AuthModule } from "./module/auth";
import { jwtConfig, validateEnvironment } from "./config";

import { AdminModule } from "./module/admin/admin.module";
import { DashboardModule } from "./module/dashboard/dashboard.module";
import { CoursesModule } from "./module/courses";
import { FlashcardsModule } from "./module/flashcards/flashcards.module";
import { PracticeModule } from "./module/practice/practice.module";
import { ReviewModule } from "./module/review/review.module";
import { TopicsModule } from "./module/topics/topics.module";
import { VocabularyModule } from "./module/vocabulary/vocabulary.module";
import { ProgressModule } from "./module/progress/progress.module";
import { PlacementTestModule } from "./module/placement-test/placement-test.module";
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
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthContextInterceptor,
    },
  ],
})
export class AppModule {}
