import assert from "node:assert/strict";
import test from "node:test";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Separator,
} from "../src/index";

test("ui package exposes shared primitive components from one root interface", () => {
  assert.equal(typeof Avatar, "object");
  assert.equal(typeof AvatarImage, "object");
  assert.equal(typeof AvatarFallback, "object");
  assert.equal(typeof Dialog, "function");
  assert.equal(typeof DialogContent, "object");
  assert.equal(typeof DialogTitle, "object");
  assert.equal(typeof DialogDescription, "object");
  assert.equal(typeof Separator, "object");
});
