import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { createReadStream } from "node:fs";
import type { Response } from "express";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { GetToeicWritingImageUseCase } from "./use-cases/get-toeic-writing-image.use-case";

@Controller("toeic/writing")
@UseGuards(UserJwtGuard)
export class ToeicWritingMediaController {
  constructor(private readonly getImage: GetToeicWritingImageUseCase) {}

  @Get("tasks/:taskId/image")
  async image(
    @Param("taskId", ParseIntPipe) taskId: number,
    @Res({ passthrough: true }) response: Response
  ) {
    const image = await this.getImage.execute(taskId);
    response.setHeader("Content-Type", image.contentType);
    response.setHeader("Content-Length", image.bytes);
    response.setHeader("ETag", image.etag);
    return new StreamableFile(createReadStream(image.absolutePath), {
      type: image.contentType,
      length: image.bytes,
    });
  }
}
