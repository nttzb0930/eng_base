import { Module } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { resolve } from "node:path";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { applicationConfig } from "../../config";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ToeicWritingController } from "./toeic-writing.controller";
import { ToeicWritingMediaController } from "./toeic-writing-media.controller";
import { DeleteToeicWritingDraftUseCase } from "./use-cases/delete-toeic-writing-draft.use-case";
import { GetToeicWritingDraftUseCase } from "./use-cases/get-toeic-writing-draft.use-case";
import { GetToeicWritingImageUseCase } from "./use-cases/get-toeic-writing-image.use-case";
import { GetToeicWritingOverviewUseCase } from "./use-cases/get-toeic-writing-overview.use-case";
import { GetToeicWritingSubmissionUseCase } from "./use-cases/get-toeic-writing-submission.use-case";
import { GetToeicWritingTaskUseCase } from "./use-cases/get-toeic-writing-task.use-case";
import { ListToeicWritingTasksUseCase } from "./use-cases/list-toeic-writing-tasks.use-case";
import { SaveToeicWritingDraftUseCase } from "./use-cases/save-toeic-writing-draft.use-case";
import { SubmitToeicWritingTaskUseCase } from "./use-cases/submit-toeic-writing-task.use-case";

@Module({
  controllers: [ToeicWritingController, ToeicWritingMediaController],
  providers: [
    GetToeicWritingOverviewUseCase,
    ListToeicWritingTasksUseCase,
    GetToeicWritingTaskUseCase,
    GetToeicWritingDraftUseCase,
    SaveToeicWritingDraftUseCase,
    DeleteToeicWritingDraftUseCase,
    SubmitToeicWritingTaskUseCase,
    GetToeicWritingSubmissionUseCase,
    {
      provide: GetToeicWritingImageUseCase,
      inject: [PrismaService, applicationConfig.KEY],
      useFactory: (
        prisma: PrismaService,
        application: ConfigType<typeof applicationConfig>
      ) =>
        new GetToeicWritingImageUseCase(
          prisma,
          resolve(application.licensedContentRoot, "writing")
        ),
    },
    UserJwtGuard,
  ],
})
export class ToeicWritingModule {}
