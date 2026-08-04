import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import {
  ReadingPassageCreateDto,
  ReadingPassageUpdateDto,
} from "./dto/reading.dto";
import { CreateAdminReadingPassageUseCase } from "./use-cases/create-admin-reading-passage.use-case";
import { GetAdminReadingPassageUseCase } from "./use-cases/get-admin-reading-passage.use-case";
import { ListAdminReadingPassagesUseCase } from "./use-cases/list-admin-reading-passages.use-case";
import { ListReadingTopicOptionsUseCase } from "./use-cases/list-reading-topic-options.use-case";
import { PublishAdminReadingPassageUseCase } from "./use-cases/publish-admin-reading-passage.use-case";
import { UnpublishAdminReadingPassageUseCase } from "./use-cases/unpublish-admin-reading-passage.use-case";
import { UpdateAdminReadingPassageUseCase } from "./use-cases/update-admin-reading-passage.use-case";

@Controller("admin/reading-passages")
@UseGuards(AdminJwtGuard)
export class AdminReadingController {
  constructor(
    private readonly listPassages: ListAdminReadingPassagesUseCase,
    private readonly listTopicOptions: ListReadingTopicOptionsUseCase,
    private readonly getPassage: GetAdminReadingPassageUseCase,
    private readonly createPassage: CreateAdminReadingPassageUseCase,
    private readonly updatePassage: UpdateAdminReadingPassageUseCase,
    private readonly publishPassage: PublishAdminReadingPassageUseCase,
    private readonly unpublishPassage: UnpublishAdminReadingPassageUseCase,
  ) {}

  @Get()
  list() {
    return this.listPassages.execute();
  }

  @Get("topic-options")
  topicOptions() {
    return this.listTopicOptions.execute();
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.getPassage.execute(id);
  }

  @Post()
  create(@Body() body: ReadingPassageCreateDto) {
    return this.createPassage.execute(body);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ReadingPassageUpdateDto,
  ) {
    return this.updatePassage.execute(id, body);
  }

  @Post(":id/publish")
  publish(@Param("id", ParseIntPipe) id: number) {
    return this.publishPassage.execute(id);
  }

  @Post(":id/unpublish")
  unpublish(@Param("id", ParseIntPipe) id: number) {
    return this.unpublishPassage.execute(id);
  }
}
