import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, formatDateTime, formatRelativeTime } from "../src/lib/format-date.ts";

test("publication dates retain the author's timezone across daylight saving changes", () => {
  assert.equal(formatDate("2026-01-01T02:00:00Z"), "Dec 31, 2025");
  assert.equal(formatDateTime("2026-01-06T19:58:00Z"), "Jan 6, 2026 at 2:58 PM");
  assert.equal(formatDateTime("2026-06-05T21:35:00Z"), "Jun 5, 2026 at 5:35 PM");
  assert.equal(formatDate("invalid"), "");
  assert.equal(formatDateTime("invalid"), "");
  assert.equal(
    formatRelativeTime("2026-01-05T12:00:00Z", new Date("2026-01-06T12:00:00Z")),
    "yesterday",
  );
});
