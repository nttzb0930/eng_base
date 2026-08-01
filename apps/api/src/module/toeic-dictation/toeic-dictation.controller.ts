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
import { ToeicDictationQueryDto, ToeicDictationSubmitDto } from "./dto/toeic-dictation.dto";
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
  ) {}

  @Get("overview")
  overview() {
    return this.overviewUseCase.execute();
  }

  @Get("sets")
  sets(
    @CurrentUserId() userId: string,
    @Query() query: ToeicDictationQueryDto,
  ) {
    return this.listSetsUseCase.execute(userId, query);
  }

  @Get("sets/:setId/items")
  setItems(
    @CurrentUserId() userId: string,
    @Param("setId", ParseIntPipe) setId: number,
  ) {
    return this.getSetUseCase.execute(userId, setId);
  }

  @Get("sets/:setId/progress")
  progress(
    @CurrentUserId() userId: string,
    @Param("setId", ParseIntPipe) setId: number,
  ) {
    return this.progressUseCase.execute(userId, setId);
  }

  @Post("items/:itemId/submit")
  submit(
    @CurrentUserId() userId: string,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() body: ToeicDictationSubmitDto,
  ) {
    return this.submitUseCase.execute(userId, { ...body, itemId });
  }
}
