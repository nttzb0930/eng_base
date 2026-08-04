import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import {
  ConvertReadingSourceCandidateDto,
  ReadingSourceCandidateQueryDto,
  RejectReadingSourceCandidateDto,
} from "./dto/reading-source-candidate.dto";
import { ConvertReadingSourceCandidateUseCase } from "./use-cases/convert-reading-source-candidate.use-case";
import { GetReadingSourceCandidateUseCase } from "./use-cases/get-reading-source-candidate.use-case";
import { ListReadingSourceCandidatesUseCase } from "./use-cases/list-reading-source-candidates.use-case";
import { RejectReadingSourceCandidateUseCase } from "./use-cases/reject-reading-source-candidate.use-case";

@Controller("admin/reading-source-candidates")
@UseGuards(AdminJwtGuard)
export class AdminReadingSourceCandidatesController {
  constructor(
    private readonly listCandidates: ListReadingSourceCandidatesUseCase,
    private readonly getCandidate: GetReadingSourceCandidateUseCase,
    private readonly convertCandidate: ConvertReadingSourceCandidateUseCase,
    private readonly rejectCandidate: RejectReadingSourceCandidateUseCase,
  ) {}

  @Get()
  list(@Query() query: ReadingSourceCandidateQueryDto) {
    return this.listCandidates.execute(query);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.getCandidate.execute(id);
  }

  @Post(":id/convert")
  convert(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConvertReadingSourceCandidateDto,
  ) {
    return this.convertCandidate.execute(id, body);
  }

  @Post(":id/reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RejectReadingSourceCandidateDto,
  ) {
    return this.rejectCandidate.execute(id, body);
  }
}
