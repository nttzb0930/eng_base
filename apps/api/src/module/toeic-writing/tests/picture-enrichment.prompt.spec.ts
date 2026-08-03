import assert from "node:assert/strict";
import test from "node:test";

import { buildPictureEnrichmentPrompt } from "../provider/picture-enrichment.prompt";

test("picture enrichment prompt requires strict JSON and required-word grounding", () => {
  const prompt = buildPictureEnrichmentPrompt(["vendor", "cart"]);

  assert.match(prompt, /Return ONLY valid JSON/u);
  assert.match(prompt, /Do not wrap the JSON in Markdown/u);
  assert.match(prompt, /requiredWordGrounding/u);
  assert.match(prompt, /vendor/u);
  assert.match(prompt, /cart/u);
});
