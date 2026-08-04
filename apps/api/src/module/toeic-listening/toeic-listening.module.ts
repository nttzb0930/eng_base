import { Module } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { applicationConfig } from "../../config";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ToeicListeningMediaController } from "./toeic-listening-media.controller";
import { ToeicListeningController } from "./toeic-listening.controller";
import { GetToeicListeningMediaUseCase } from "./use-cases/get-toeic-listening-media.use-case";
import { GetToeicListeningOverviewUseCase } from "./use-cases/get-toeic-listening-overview.use-case";
import { GetToeicListeningTestUseCase } from "./use-cases/get-toeic-listening-test.use-case";
import { ListToeicListeningTestsUseCase } from "./use-cases/list-toeic-listening-tests.use-case";
import { GetToeicListeningAttemptUseCase } from "./use-cases/get-toeic-listening-attempt.use-case";
import { ListToeicListeningAttemptsUseCase } from "./use-cases/list-toeic-listening-attempts.use-case";
import { SubmitToeicListeningAttemptUseCase } from "./use-cases/submit-toeic-listening-attempt.use-case";
import { DeleteToeicListeningDraftUseCase } from "./use-cases/delete-toeic-listening-draft.use-case";
import { GetToeicListeningDraftUseCase } from "./use-cases/get-toeic-listening-draft.use-case";
import { SaveToeicListeningDraftUseCase } from "./use-cases/save-toeic-listening-draft.use-case";
import { CheckToeicListeningAnswerUseCase } from "./use-cases/check-toeic-listening-answer.use-case";

@Module({
  controllers: [ToeicListeningController, ToeicListeningMediaController],
  providers: [
    GetToeicListeningOverviewUseCase,
    ListToeicListeningTestsUseCase,
    GetToeicListeningTestUseCase,
    ListToeicListeningAttemptsUseCase,
    GetToeicListeningAttemptUseCase,
    SubmitToeicListeningAttemptUseCase,
    GetToeicListeningDraftUseCase,
    SaveToeicListeningDraftUseCase,
    DeleteToeicListeningDraftUseCase,
    CheckToeicListeningAnswerUseCase,
    {
      provide: GetToeicListeningMediaUseCase,
      inject: [PrismaService, applicationConfig.KEY],
      useFactory: (
        prisma: PrismaService,
        application: ConfigType<typeof applicationConfig>
      ) =>
        new GetToeicListeningMediaUseCase(
          prisma,
          application.licensedContentRoot
        ),
    },
    UserJwtGuard,
  ],
})
export class ToeicListeningModule {}
