import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { AdminReadingController } from "./admin-reading.controller";
import { CreateAdminReadingPassageUseCase } from "./use-cases/create-admin-reading-passage.use-case";
import { GetAdminReadingPassageUseCase } from "./use-cases/get-admin-reading-passage.use-case";
import { ListAdminReadingPassagesUseCase } from "./use-cases/list-admin-reading-passages.use-case";
import { ListReadingTopicOptionsUseCase } from "./use-cases/list-reading-topic-options.use-case";
import { PublishAdminReadingPassageUseCase } from "./use-cases/publish-admin-reading-passage.use-case";
import { UnpublishAdminReadingPassageUseCase } from "./use-cases/unpublish-admin-reading-passage.use-case";
import { UpdateAdminReadingPassageUseCase } from "./use-cases/update-admin-reading-passage.use-case";

@Module({
  controllers: [AdminReadingController],
  providers: [
    ListAdminReadingPassagesUseCase,
    ListReadingTopicOptionsUseCase,
    GetAdminReadingPassageUseCase,
    CreateAdminReadingPassageUseCase,
    UpdateAdminReadingPassageUseCase,
    PublishAdminReadingPassageUseCase,
    UnpublishAdminReadingPassageUseCase,
    AdminJwtGuard,
  ],
})
export class ReadingModule {}
