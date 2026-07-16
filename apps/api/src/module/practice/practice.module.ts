import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { AdminPracticeSessionsController } from "./admin-practice-sessions.controller";
import { PracticeController } from "./practice.controller";
import { CreatePracticeSessionResultUseCase } from "./use-cases/create-practice-session-result.use-case";
import { GetAdminPracticeSessionUseCase } from "./use-cases/get-admin-practice-session.use-case";
import { GetDictationPracticeChallengesUseCase } from "./use-cases/get-dictation-practice-challenges.use-case";
import { GetDictationPracticeSummaryUseCase } from "./use-cases/get-dictation-practice-summary.use-case";
import { GetFillBlankPracticeChallengesUseCase } from "./use-cases/get-fill-blank-practice-challenges.use-case";
import { GetFillBlankPracticeSummaryUseCase } from "./use-cases/get-fill-blank-practice-summary.use-case";
import { GetListeningPracticeChallengesUseCase } from "./use-cases/get-listening-practice-challenges.use-case";
import { GetListeningPracticeSummaryUseCase } from "./use-cases/get-listening-practice-summary.use-case";
import { GetWeakWordsPracticeChallengesUseCase } from "./use-cases/get-weak-words-practice-challenges.use-case";
import { GetWeakWordsPracticeSummaryUseCase } from "./use-cases/get-weak-words-practice-summary.use-case";
import { ListAdminPracticeSessionsUseCase } from "./use-cases/list-admin-practice-sessions.use-case";
import { PracticeChallengeBuilder } from "./use-cases/practice-challenge.builder";
import { RemoveAdminPracticeSessionUseCase } from "./use-cases/remove-admin-practice-session.use-case";

@Module({
  controllers: [PracticeController, AdminPracticeSessionsController],
  providers: [
    PracticeChallengeBuilder,
    GetFillBlankPracticeSummaryUseCase,
    GetFillBlankPracticeChallengesUseCase,
    GetListeningPracticeSummaryUseCase,
    GetListeningPracticeChallengesUseCase,
    GetDictationPracticeSummaryUseCase,
    GetDictationPracticeChallengesUseCase,
    GetWeakWordsPracticeSummaryUseCase,
    GetWeakWordsPracticeChallengesUseCase,
    CreatePracticeSessionResultUseCase,
    ListAdminPracticeSessionsUseCase,
    GetAdminPracticeSessionUseCase,
    RemoveAdminPracticeSessionUseCase,
    UserJwtGuard,
    AdminJwtGuard,
  ],
})
export class PracticeModule {}
