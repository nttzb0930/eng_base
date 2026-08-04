import assert from "node:assert/strict";
import test from "node:test";

import { useExitModal } from "./exit-modal.store";

test("exit modal keeps the requested destination", () => {
  useExitModal.getState().close();
  useExitModal.getState().open("/practice");

  assert.deepEqual(useExitModal.getState(), {
    isOpen: true,
    destination: "/practice",
    open: useExitModal.getState().open,
    close: useExitModal.getState().close,
  });
});
