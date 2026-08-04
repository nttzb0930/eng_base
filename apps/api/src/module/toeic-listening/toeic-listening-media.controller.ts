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
  GetToeicListeningMediaUseCase,
  type LocalMediaDescriptor,
} from "./use-cases/get-toeic-listening-media.use-case";

type ByteRange = { start: number; end: number };

function rangeNotSatisfiable(): never {
  throw new HttpException(
    {
      statusCode: 416,
      message: "Requested range not satisfiable",
      error: "Range Not Satisfiable",
      code: "TOEIC_LISTENING_MEDIA_RANGE_INVALID",
    },
    416
  );
}

export function parseToeicListeningRange(
  header: string | undefined,
  size: number
): ByteRange | null {
  if (header === undefined) return null;
  if (size <= 0 || header.includes(",")) return rangeNotSatisfiable();
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return rangeNotSatisfiable();

  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2]!, 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return rangeNotSatisfiable();
    }
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number.parseInt(match[1], 10);
  const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    return rangeNotSatisfiable();
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

function setCommonHeaders(response: Response, media: LocalMediaDescriptor) {
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Content-Type", media.contentType);
  response.setHeader("ETag", media.etag);
}

function safeStreamableFile(
  absolutePath: string,
  options: { start?: number; end?: number },
  contentType: string,
  length: number
) {
  return new StreamableFile(createReadStream(absolutePath, options), {
    type: contentType,
    length,
  })
    .setErrorHandler((_error, response) => {
      if (response.destroyed) return;
      if (response.headersSent) {
        response.end();
        return;
      }
      response.statusCode = 500;
      response.send("Media stream failed");
    })
    .setErrorLogger(() => undefined);
}

@Controller("toeic/listening/media")
@UseGuards(UserJwtGuard)
export class ToeicListeningMediaController {
  constructor(private readonly getMedia: GetToeicListeningMediaUseCase) {}

  @Head(":assetId")
  async head(
    @Param("assetId", ParseIntPipe) assetId: number,
    @Res() response: Response
  ) {
    const media = await this.getMedia.execute(assetId);
    setCommonHeaders(response, media);
    response.setHeader("Content-Length", media.bytes);
    response.status(200).end();
  }

  @Get(":assetId")
  async get(
    @Param("assetId", ParseIntPipe) assetId: number,
    @Headers("range") rangeHeader: string | undefined,
    @Res({ passthrough: true }) response: Response
  ) {
    const media = await this.getMedia.execute(assetId);
    setCommonHeaders(response, media);
    let range: ByteRange | null;
    try {
      range = parseToeicListeningRange(rangeHeader, media.bytes);
    } catch (error) {
      response.setHeader("Content-Range", `bytes */${media.bytes}`);
      throw error;
    }

    if (range === null) {
      response.status(200);
      response.setHeader("Content-Length", media.bytes);
      return safeStreamableFile(
        media.absolutePath,
        {},
        media.contentType,
        media.bytes
      );
    }

    const length = range.end - range.start + 1;
    response.status(206);
    response.setHeader(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${media.bytes}`
    );
    response.setHeader("Content-Length", length);
    return safeStreamableFile(
      media.absolutePath,
      {
        start: range.start,
        end: range.end,
      },
      media.contentType,
      length
    );
  }
}
