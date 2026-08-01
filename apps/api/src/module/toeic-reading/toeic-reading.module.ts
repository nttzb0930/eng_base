import { Module } from "@nestjs/common";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { ToeicReadingController } from "./toeic-reading.controller";
import { GetToeicReadingOverviewUseCase } from "./use-cases/get-toeic-reading-overview.use-case";
import { GetToeicReadingTestUseCase } from "./use-cases/get-toeic-reading-test.use-case";
import { ListToeicReadingTestsUseCase } from "./use-cases/list-toeic-reading-tests.use-case";
import { GetToeicReadingAttemptUseCase } from "./use-cases/get-toeic-reading-attempt.use-case";
import { ListToeicReadingAttemptsUseCase } from "./use-cases/list-toeic-reading-attempts.use-case";
import { SubmitToeicReadingAttemptUseCase } from "./use-cases/submit-toeic-reading-attempt.use-case";
import { DeleteToeicReadingDraftUseCase } from "./use-cases/delete-toeic-reading-draft.use-case";
import { GetToeicReadingDraftUseCase } from "./use-cases/get-toeic-reading-draft.use-case";
import { SaveToeicReadingDraftUseCase } from "./use-cases/save-toeic-reading-draft.use-case";

@Module({
  controllers: [ToeicReadingController],
  providers: [
    GetToeicReadingOverviewUseCase,
    ListToeicReadingTestsUseCase,
    GetToeicReadingTestUseCase,
    ListToeicReadingAttemptsUseCase,
    GetToeicReadingAttemptUseCase,
    SubmitToeicReadingAttemptUseCase,
    GetToeicReadingDraftUseCase,
    SaveToeicReadingDraftUseCase,
    DeleteToeicReadingDraftUseCase,
    UserJwtGuard,
  ],
})
export class ToeicReadingModule {}
