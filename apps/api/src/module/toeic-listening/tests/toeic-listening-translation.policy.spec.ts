import assert from "node:assert/strict";
import test from "node:test";

import { parseToeicListeningChoiceTranslation } from "../use-cases/toeic-listening-translation.policy";

test("Part 1 translation is split into four translated choices", () => {
  assert.deepEqual(
    parseToeicListeningChoiceTranslation(
      1,
      "(A) Anh ấy đang sửa ngăn kéo.\n\n(B) Anh ấy đang xắn tay áo.\n(C) Anh ấy đang đóng máy tính.\n\n(D) Anh ấy đang uống nước."
    ),
    {
      questionTranslation: null,
      answerTranslations: [
        { label: "A", text: "Anh ấy đang sửa ngăn kéo." },
        { label: "B", text: "Anh ấy đang xắn tay áo." },
        { label: "C", text: "Anh ấy đang đóng máy tính." },
        { label: "D", text: "Anh ấy đang uống nước." },
      ],
    }
  );
});

test("Part 2 translation separates the spoken question from A-C", () => {
  assert.deepEqual(
    parseToeicListeningChoiceTranslation(
      2,
      "Máy pha cà phê ở đâu?\n\n(A) Ở kệ dưới cùng.\n\n(B) Một chiếc thìa lớn.\n\n(C) Nó đã được giảm giá."
    ),
    {
      questionTranslation: "Máy pha cà phê ở đâu?",
      answerTranslations: [
        { label: "A", text: "Ở kệ dưới cùng." },
        { label: "B", text: "Một chiếc thìa lớn." },
        { label: "C", text: "Nó đã được giảm giá." },
      ],
    }
  );
});

test("Parts 3-4 do not mislabel passage translation as option translation", () => {
  assert.deepEqual(
    parseToeicListeningChoiceTranslation(3, "Bản dịch cả cuộc hội thoại."),
    { questionTranslation: null, answerTranslations: [] }
  );
  assert.deepEqual(parseToeicListeningChoiceTranslation(4, null), {
    questionTranslation: null,
    answerTranslations: [],
  });
});
