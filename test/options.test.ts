import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWholeNumber } from "../src/options.ts";

test("accepts whole numbers inside the range", () => {
  assert.equal(parseWholeNumber("warn-days", "21", 0, 3650), 21);
  assert.equal(parseWholeNumber("warn-days", " 0 ", 0, 3650), 0);
});

test("rejects typos, fractions, negatives and out-of-range values", () => {
  for (const bad of ["abc", "", "1.5", "-3", "2e3", "0x10", undefined]) {
    assert.throws(() => parseWholeNumber("warn-days", bad, 0, 3650), RangeError, String(bad));
  }
  assert.throws(() => parseWholeNumber("concurrency", "0", 1, 256), /from 1 to 256/);
});
