import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { AdminReadingController } from "./admin-reading.controller";
import { ReadingController } from "./reading.controller";
import { CreateAdminReadingPassageUseCase } from "./use-cases/create-admin-reading-passage.use-case";
import { GetAdminReadingPassageUseCase } from "./use-cases/get-admin-reading-passage.use-case";
import { ListAdminReadingPassagesUseCase } from "./use-cases/list-admin-reading-passages.use-case";
import { ListReadingTopicOptionsUseCase } from "./use-cases/list-reading-topic-options.use-case";
import { PublishAdminReadingPassageUseCase } from "./use-cases/publish-admin-reading-passage.use-case";
import { UnpublishAdminReadingPassageUseCase } from "./use-cases/unpublish-admin-reading-passage.use-case";
import { UpdateAdminReadingPassageUseCase } from "./use-cases/update-admin-reading-passage.use-case";
import { GetReadingAttemptUseCase } from "./use-cases/get-reading-attempt.use-case";
import { GetReadingPassageUseCase } from "./use-cases/get-reading-passage.use-case";
import { ListReadingAttemptsUseCase } from "./use-cases/list-reading-attempts.use-case";
import { ListReadingPassagesUseCase } from "./use-cases/list-reading-passages.use-case";
import { SubmitReadingAttemptUseCase } from "./use-cases/submit-reading-attempt.use-case";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { AdminReadingSourceCandidatesController } from "./admin-reading-source-candidates.controller";
import { ReadingSourceCandidateRepository } from "./repository/reading-source-candidate.repository";
import { PrismaReadingSourceCandidateRepository } from "./repository/prisma-reading-source-candidate.repository";
import { ConvertReadingSourceCandidateUseCase } from "./use-cases/convert-reading-source-candidate.use-case";
import { GetReadingSourceCandidateUseCase } from "./use-cases/get-reading-source-candidate.use-case";
import { ListReadingSourceCandidatesUseCase } from "./use-cases/list-reading-source-candidates.use-case";
import { RejectReadingSourceCandidateUseCase } from "./use-cases/reject-reading-source-candidate.use-case";

@Module({
  controllers: [
    AdminReadingController,
    AdminReadingSourceCandidatesController,
    ReadingController,
  ],
  providers: [
    ListAdminReadingPassagesUseCase,
    ListReadingTopicOptionsUseCase,
    GetAdminReadingPassageUseCase,
    CreateAdminReadingPassageUseCase,
    UpdateAdminReadingPassageUseCase,
    PublishAdminReadingPassageUseCase,
    UnpublishAdminReadingPassageUseCase,
    ListReadingPassagesUseCase,
    GetReadingPassageUseCase,
    ListReadingAttemptsUseCase,
    GetReadingAttemptUseCase,
    SubmitReadingAttemptUseCase,
    ListReadingSourceCandidatesUseCase,
    GetReadingSourceCandidateUseCase,
    ConvertReadingSourceCandidateUseCase,
    RejectReadingSourceCandidateUseCase,
    {
      provide: ReadingSourceCandidateRepository,
      useClass: PrismaReadingSourceCandidateRepository,
    },
    AdminJwtGuard,
    UserJwtGuard,
  ],
})
export class ReadingModule {}
