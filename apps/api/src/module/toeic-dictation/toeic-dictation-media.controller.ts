import {
  Controller,
  Get,
  Head,
  Headers,
  HttpException,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { createReadStream } from "node:fs";
import type { Response } from "express";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  GetToeicDictationMediaUseCase,
  type ToeicDictationLocalMediaDescriptor,
} from "./use-cases/get-toeic-dictation-media.use-case";

type ByteRange = { start: number; end: number };

function parseRange(header: string | undefined, size: number): ByteRange | null {
  if (header === undefined) return null;
  if (size <= 0 || header.includes(",")) throwRange();
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (!match || (!match[1] && !match[2])) throwRange();
  if (!match[1]) {
    const suffix = Number.parseInt(match[2]!, 10);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throwRange();
    return { start: Math.max(size - suffix, 0), end: size - 1 };
  }
  const start = Number.parseInt(match[1], 10);
  const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) {
    throwRange();
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

function throwRange(): never {
  throw new HttpException(
    { statusCode: 416, message: "Requested range not satisfiable", code: "TOEIC_DICTATION_MEDIA_RANGE_INVALID" },
    416,
  );
}

function setHeaders(response: Response, media: ToeicDictationLocalMediaDescriptor) {
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Content-Type", media.contentType);
  response.setHeader("ETag", media.etag);
}

function stream(path: string, options: { start?: number; end?: number }, type: string, length: number) {
  return new StreamableFile(createReadStream(path, options), { type, length });
}

@Controller("toeic/dictation/media")
@UseGuards(UserJwtGuard)
export class ToeicDictationMediaController {
  constructor(private readonly getMedia: GetToeicDictationMediaUseCase) {}

  @Head(":itemId")
  async head(@Param("itemId", ParseIntPipe) itemId: number, @Res() response: Response) {
    const media = await this.getMedia.execute(itemId);
    setHeaders(response, media);
    response.setHeader("Content-Length", media.bytes);
    response.status(200).end();
  }

  @Get(":itemId")
  async get(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Headers("range") rangeHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const media = await this.getMedia.execute(itemId);
    setHeaders(response, media);
    let range: ByteRange | null;
    try {
      range = parseRange(rangeHeader, media.bytes);
    } catch (error) {
      response.setHeader("Content-Range", `bytes */${media.bytes}`);
      throw error;
    }
    if (!range) {
      response.status(200);
      response.setHeader("Content-Length", media.bytes);
      return stream(media.absolutePath, {}, media.contentType, media.bytes);
    }
    const length = range.end - range.start + 1;
    response.status(206);
    response.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${media.bytes}`);
    response.setHeader("Content-Length", length);
    return stream(media.absolutePath, { start: range.start, end: range.end }, media.contentType, length);
  }
}
