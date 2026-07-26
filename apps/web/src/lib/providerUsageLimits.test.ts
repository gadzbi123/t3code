import { ProviderDriverKind } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  formatRemainingPercentage,
  formatResetCountdown,
  formatWeeklyLimit,
  getCodexWeeklyLimitProvider,
  isProviderUsageSnapshotStale,
  selectWeeklyUsageLimit,
  shouldRefreshWeeklyLimitOnOpen,
} from "./providerUsageLimits";

const NOW = Date.parse("2026-07-26T12:00:00.000Z");

describe("provider usage limit formatting", () => {
  it("formats percentage remaining and clamps unexpected inputs", () => {
    expect(formatRemainingPercentage(21)).toBe("79% left");
    expect(formatRemainingPercentage(-5)).toBe("100% left");
    expect(formatRemainingPercentage(110)).toBe("0% left");
  });

  it("formats day, hour, minute, and elapsed reset deadlines", () => {
    expect(formatResetCountdown("2026-08-01T12:00:00.000Z", NOW)).toBe("resets in 6d");
    expect(formatResetCountdown("2026-07-26T18:01:00.000Z", NOW)).toBe("resets in 7h");
    expect(formatResetCountdown("2026-07-26T12:06:00.000Z", NOW)).toBe("resets in 6m");
    expect(formatResetCountdown("2026-07-26T12:00:00.000Z", NOW)).toBe("reset pending");
  });

  it("selects only the seven-day duration and handles a missing reset", () => {
    const weekly = selectWeeklyUsageLimit([
      { usedPercent: 5, windowDurationMinutes: 300 },
      { usedPercent: 21, windowDurationMinutes: 10_080 },
    ]);
    expect(weekly).toEqual({ usedPercent: 21, windowDurationMinutes: 10_080 });
    expect(formatWeeklyLimit(weekly!, NOW)).toBe("79% left");
  });
});

describe("provider usage refresh policy", () => {
  const staleCheckedAt = "2026-07-26T11:58:00.000Z";
  const freshCheckedAt = "2026-07-26T11:59:30.000Z";

  it("refreshes one stale instance snapshot on open", () => {
    expect(isProviderUsageSnapshotStale(staleCheckedAt, NOW)).toBe(true);
    expect(
      shouldRefreshWeeklyLimitOnOpen({
        open: true,
        checkedAt: staleCheckedAt,
        lastAttemptedCheckedAt: null,
        nowMs: NOW,
      }),
    ).toBe(true);
  });

  it("does not refresh fresh snapshots, closed popovers, or repeated opens", () => {
    expect(isProviderUsageSnapshotStale(freshCheckedAt, NOW)).toBe(false);
    expect(
      shouldRefreshWeeklyLimitOnOpen({
        open: true,
        checkedAt: freshCheckedAt,
        lastAttemptedCheckedAt: null,
        nowMs: NOW,
      }),
    ).toBe(false);
    expect(
      shouldRefreshWeeklyLimitOnOpen({
        open: false,
        checkedAt: staleCheckedAt,
        lastAttemptedCheckedAt: null,
        nowMs: NOW,
      }),
    ).toBe(false);
    expect(
      shouldRefreshWeeklyLimitOnOpen({
        open: true,
        checkedAt: staleCheckedAt,
        lastAttemptedCheckedAt: staleCheckedAt,
        nowMs: NOW,
      }),
    ).toBe(false);
  });
});

describe("Codex-only UI projection", () => {
  it("exposes the active Codex snapshot and omits unsupported providers", () => {
    const usageLimits = [{ usedPercent: 21, windowDurationMinutes: 10_080 }];
    expect(
      getCodexWeeklyLimitProvider({
        driver: ProviderDriverKind.make("codex"),
        checkedAt: "2026-07-26T12:00:00.000Z",
        usageLimits,
      }),
    ).toEqual({ checkedAt: "2026-07-26T12:00:00.000Z", usageLimits });
    expect(
      getCodexWeeklyLimitProvider({
        driver: ProviderDriverKind.make("claudeAgent"),
        checkedAt: "2026-07-26T12:00:00.000Z",
        usageLimits,
      }),
    ).toBeUndefined();
  });
});
