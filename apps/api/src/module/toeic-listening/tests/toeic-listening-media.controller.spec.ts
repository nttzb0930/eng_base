import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { HttpException, RequestMethod, StreamableFile } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";

import { UserJwtGuard } from "../../../common/guards/user-jwt.guard";
import {
  parseToeicListeningRange,
  ToeicListeningMediaController,
} from "../toeic-listening-media.controller";

test("Range parser accepts complete, open, and suffix single byte ranges", () => {
  assert.equal(parseToeicListeningRange(undefined, 10), null);
  assert.deepEqual(parseToeicListeningRange("bytes=2-5", 10), {
    start: 2,
    end: 5,
  });
  assert.deepEqual(parseToeicListeningRange("bytes=7-", 10), {
    start: 7,
    end: 9,
  });
  assert.deepEqual(parseToeicListeningRange("bytes=-3", 10), {
    start: 7,
    end: 9,
  });
});

test("Range parser rejects malformed, multiple, and unsatisfiable ranges", () => {
  for (const range of [
    "items=0-1",
    "bytes=0-1,3-4",
    "bytes=10-",
    "bytes=5-4",
    "bytes=-0",
  ]) {
    assert.throws(
      () => parseToeicListeningRange(range, 10),
      (error) => error instanceof HttpException && error.getStatus() === 416
    );
  }
});

test("media controller exposes guarded GET and HEAD routes", () => {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, ToeicListeningMediaController),
    "toeic/listening/media"
  );
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ToeicListeningMediaController
  ) as unknown[];
  assert.ok(guards.includes(UserJwtGuard));
  const routes = Object.getOwnPropertyNames(
    ToeicListeningMediaController.prototype
  )
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        ToeicListeningMediaController.prototype,
        property
      )?.value as unknown;
      if (typeof handler !== "function") return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];
      return [`${RequestMethod[method]} ${path}`];
    })
    .sort();
  assert.deepEqual(routes, ["GET :assetId", "HEAD :assetId"]);
});

test("media controller returns complete and partial stream metadata", async () => {
  const headers: Record<string, string> = {};
  let statusCode = 0;
  const response = {
    setHeader: (name: string, value: string | number) => {
      headers[name] = String(value);
    },
    status: (status: number) => {
      statusCode = status;
      return response;
    },
  };
  const controller = new ToeicListeningMediaController({
    execute: () =>
      Promise.resolve({
        absolutePath: __filename,
        bytes: 10,
        contentType: "audio/mpeg",
        etag: '"etag"',
      }),
  } as never);

  const complete = await controller.get(7, undefined, response as never);
  assert.ok(complete instanceof StreamableFile);
  assert.equal(statusCode, 200);
  assert.equal(headers["Accept-Ranges"], "bytes");
  assert.equal(headers["Content-Length"], "10");
  assert.equal(headers.ETag, '"etag"');

  const partial = await controller.get(7, "bytes=2-5", response as never);
  assert.ok(partial instanceof StreamableFile);
  assert.equal(statusCode, 206);
  assert.equal(headers["Content-Range"], "bytes 2-5/10");
  assert.equal(headers["Content-Length"], "4");
});

test("media controller returns HEAD metadata and a Content-Range on 416", async () => {
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let ended = false;
  const response = {
    setHeader: (name: string, value: string | number) => {
      headers[name] = String(value);
    },
    status: (status: number) => {
      statusCode = status;
      return response;
    },
    end: () => {
      ended = true;
    },
  };
  const controller = new ToeicListeningMediaController({
    execute: () =>
      Promise.resolve({
        absolutePath: __filename,
        bytes: 10,
        contentType: "audio/mpeg",
        etag: '"etag"',
      }),
  } as never);

  await controller.head(7, response as never);
  assert.equal(statusCode, 200);
  assert.equal(ended, true);
  assert.equal(headers["Content-Length"], "10");

  await assert.rejects(
    () => controller.get(7, "bytes=10-", response as never),
    (error) => error instanceof HttpException && error.getStatus() === 416
  );
  assert.equal(headers["Content-Range"], "bytes */10");
});

test("media stream errors never expose filesystem error messages", async () => {
  const response = {
    setHeader: () => undefined,
    status: () => response,
  };
  const controller = new ToeicListeningMediaController({
    execute: () =>
      Promise.resolve({
        absolutePath: __filename,
        bytes: 10,
        contentType: "audio/mpeg",
        etag: '"etag"',
      }),
  } as never);
  const file = await controller.get(7, undefined, response as never);
  let body = "";
  const streamResponse = {
    destroyed: false,
    headersSent: false,
    statusCode: 0,
    send: (value: string) => {
      body = value;
    },
    end: () => undefined,
  };

  file.errorHandler(
    new Error("ENOENT C:/private/licensed/audio.mp3"),
    streamResponse
  );

  assert.equal(streamResponse.statusCode, 500);
  assert.equal(body, "Media stream failed");
});
