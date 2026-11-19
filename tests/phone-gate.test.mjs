import assert from "node:assert/strict";
import test from "node:test";
import { isPhone } from "../js/phone-gate.mjs";

test("blocks iPhones and Android phones, including in-app browsers and phone client hints", () => {
  assert.ok(isPhone({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148 [LinkedInApp]" }));
  assert.ok(isPhone({ platform: "iPhone", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)" }));
  assert.ok(isPhone({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/130 Mobile Safari/537.36" }));
  assert.ok(isPhone({ userAgent: "Mozilla/5.0", userAgentData: { mobile: true } }));
});

test("allows iPads in both mobile and desktop browsing modes", () => {
  assert.equal(isPhone({ userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0) Mobile/15E148 Safari/604.1" }), false);
  assert.equal(isPhone({ platform: "MacIntel", maxTouchPoints: 5,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1.15" }), false);
});

test("allows Android tablets and touchscreen laptops", () => {
  assert.equal(isPhone({ userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X810) Chrome/130 Safari/537.36", userAgentData: { mobile: true } }), false);
  assert.equal(isPhone({ userAgent: "Mozilla/5.0 (Android 14; Tablet) Mobile Safari", userAgentData: { mobile: true } }), false);
  assert.equal(isPhone({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36",
    platform: "Win32", maxTouchPoints: 10, userAgentData: { mobile: false }
  }), false);
});
