import { Module } from "@nestjs/common";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import type { ConfigType } from "@nestjs/config";
import { applicationConfig } from "../../config";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ToeicDictationController } from "./toeic-dictation.controller";
import { ToeicDictationMediaController } from "./toeic-dictation-media.controller";
import { GetToeicDictationOverviewUseCase } from "./use-cases/get-toeic-dictation-overview.use-case";
import { GetToeicDictationProgressUseCase } from "./use-cases/get-toeic-dictation-progress.use-case";
import { GetToeicDictationSetUseCase } from "./use-cases/get-toeic-dictation-set.use-case";
import { ListToeicDictationSetsUseCase } from "./use-cases/list-toeic-dictation-sets.use-case";
import { SubmitToeicDictationUseCase } from "./use-cases/submit-toeic-dictation.use-case";
import { GetToeicDictationMediaUseCase } from "./use-cases/get-toeic-dictation-media.use-case";
import { GetToeicDictationCheckItemUseCase } from "./use-cases/get-toeic-dictation-check-item.use-case";
import { GetToeicDictationFullItemUseCase } from "./use-cases/get-toeic-dictation-full-item.use-case";

@Module({
  controllers: [ToeicDictationController, ToeicDictationMediaController],
  providers: [
    GetToeicDictationOverviewUseCase,
    ListToeicDictationSetsUseCase,
    GetToeicDictationSetUseCase,
    GetToeicDictationProgressUseCase,
    SubmitToeicDictationUseCase,
    GetToeicDictationCheckItemUseCase,
    GetToeicDictationFullItemUseCase,
    {
      provide: GetToeicDictationMediaUseCase,
      inject: [PrismaService, applicationConfig.KEY],
      useFactory: (
        prisma: PrismaService,
        application: ConfigType<typeof applicationConfig>,
      ) => new GetToeicDictationMediaUseCase(prisma, application.licensedContentRoot),
    },
    UserJwtGuard,
  ],
})
export class ToeicDictationModule {}
