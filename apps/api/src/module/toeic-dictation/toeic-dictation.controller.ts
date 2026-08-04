import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Body,
} from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  ToeicDictationCheckQueryDto,
  ToeicDictationQueryDto,
  ToeicDictationSubmitDto,
} from "./dto/toeic-dictation.dto";
import { GetToeicDictationCheckItemUseCase } from "./use-cases/get-toeic-dictation-check-item.use-case";
import { GetToeicDictationFullItemUseCase } from "./use-cases/get-toeic-dictation-full-item.use-case";
import { GetToeicDictationOverviewUseCase } from "./use-cases/get-toeic-dictation-overview.use-case";
import { GetToeicDictationProgressUseCase } from "./use-cases/get-toeic-dictation-progress.use-case";
import { GetToeicDictationSetUseCase } from "./use-cases/get-toeic-dictation-set.use-case";
import { ListToeicDictationSetsUseCase } from "./use-cases/list-toeic-dictation-sets.use-case";
import { SubmitToeicDictationUseCase } from "./use-cases/submit-toeic-dictation.use-case";

@Controller("toeic/dictation")
@UseGuards(UserJwtGuard)
export class ToeicDictationController {
  constructor(
    private readonly overviewUseCase: GetToeicDictationOverviewUseCase,
    private readonly listSetsUseCase: ListToeicDictationSetsUseCase,
    private readonly getSetUseCase: GetToeicDictationSetUseCase,
    private readonly progressUseCase: GetToeicDictationProgressUseCase,
    private readonly submitUseCase: SubmitToeicDictationUseCase,
    private readonly checkItemUseCase: GetToeicDictationCheckItemUseCase,
    private readonly fullItemUseCase: GetToeicDictationFullItemUseCase
  ) {}

  @Get("overview")
  overview() {
    return this.overviewUseCase.execute();
  }

  @Get("sets")
  sets(
    @CurrentUserId() userId: string,
    @Query() query: ToeicDictationQueryDto
  ) {
    return this.listSetsUseCase.execute(userId, query);
  }

  @Get("sets/:setId/items")
  setItems(
    @CurrentUserId() userId: string,
    @Param("setId", ParseIntPipe) setId: number
  ) {
    return this.getSetUseCase.execute(userId, setId);
  }

  @Get("sets/:setId/progress")
  progress(
    @CurrentUserId() userId: string,
    @Param("setId", ParseIntPipe) setId: number
  ) {
    return this.progressUseCase.execute(userId, setId);
  }

  @Get("items/:itemId/check")
  checkItem(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Query() query: ToeicDictationCheckQueryDto
  ) {
    const revealCount =
      query.reveal === "all"
        ? Number.MAX_SAFE_INTEGER
        : Number(query.reveal ?? 0);
    const revealWordIndexes = (query.revealWordIndexes ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number);
    return this.checkItemUseCase.execute(
      itemId,
      query.hide as 30 | 50 | 100,
      revealCount,
      revealWordIndexes
    );
  }

  @Get("items/:itemId/full")
  fullItem(@Param("itemId", ParseIntPipe) itemId: number) {
    return this.fullItemUseCase.execute(itemId);
  }

  @Post("items/:itemId/submit")
  submit(
    @CurrentUserId() userId: string,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() body: ToeicDictationSubmitDto
  ) {
    return this.submitUseCase.execute(userId, { ...body, itemId });
  }
}
