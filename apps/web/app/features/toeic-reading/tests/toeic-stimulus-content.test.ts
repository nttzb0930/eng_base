import assert from "node:assert/strict";
import test from "node:test";

import { parseToeicStimulusContent } from "../toeic-stimulus-content";

test("parses the supported document structure without preserving inline HTML", () => {
  const blocks = parseToeicStimulusContent(`
    <div style="width:100%" onclick="steal()">
      <p>Dear <strong>resident</strong>,<br>Please move your car.</p>
      <ul><li>May 3</li><li><em>May 4</em></li></ul>
      <table><tbody><tr><th>Date</th><td>May 3</td></tr></tbody></table>
      <img src="https://cdn.example.com/notice.png" alt="Parking notice" onerror="steal()">
    </div>
  `);
  const serialized = JSON.stringify(blocks);

  assert.match(serialized, /paragraph/);
  assert.match(serialized, /strong/);
  assert.match(serialized, /lineBreak/);
  assert.match(serialized, /unorderedList/);
  assert.match(serialized, /tableHeader/);
  assert.match(serialized, /https:\/\/cdn\.example\.com\/notice\.png/);
  assert.doesNotMatch(serialized, /onclick|onerror|style/);
});

test("drops executable content and unsafe image URLs while retaining unknown-tag text", () => {
  const blocks = parseToeicStimulusContent(`
    <script>alert("bad")</script>
    <style>body { display: none }</style>
    <custom-tag>Keep this sentence.</custom-tag>
    <img src="javascript:alert(1)" alt="unsafe">
    <a href="javascript:alert(2)">Keep link text only.</a>
  `);
  const serialized = JSON.stringify(blocks);

  assert.doesNotMatch(serialized, /alert|display: none|javascript|unsafe/);
  assert.match(serialized, /Keep this sentence/);
  assert.match(serialized, /Keep link text only/);
});

test("plain text and line breaks remain readable", () => {
  const blocks = parseToeicStimulusContent(
    "First line\nSecond &amp; final line"
  );

  assert.deepEqual(blocks, [
    {
      type: "text",
      value: "First line\nSecond & final line",
    },
  ]);
});
