import type { ServerProvider, ServerProviderUsageLimit } from "@t3tools/contracts";

export const WEEKLY_LIMIT_WINDOW_MINUTES = 7 * 24 * 60;
export const PROVIDER_USAGE_FRESHNESS_MS = 60_000;

export interface WeeklyLimitProviderSnapshot {
  readonly checkedAt: string;
  readonly usageLimits: ReadonlyArray<ServerProviderUsageLimit>;
}

export function getCodexWeeklyLimitProvider(
  provider: Pick<ServerProvider, "driver" | "checkedAt" | "usageLimits"> | null,
): WeeklyLimitProviderSnapshot | undefined {
  return provider?.driver === "codex"
    ? { checkedAt: provider.checkedAt, usageLimits: provider.usageLimits ?? [] }
    : undefined;
}

export function selectWeeklyUsageLimit(
  limits: ReadonlyArray<ServerProviderUsageLimit>,
): ServerProviderUsageLimit | undefined {
  return limits.find((limit) => limit.windowDurationMinutes === WEEKLY_LIMIT_WINDOW_MINUTES);
}

export function formatRemainingPercentage(usedPercent: number): string {
  const remaining = 100 - Math.max(0, Math.min(100, usedPercent));
  return `${Math.round(remaining)}% left`;
}

export function formatResetCountdown(resetsAt: string, nowMs = Date.now()): string {
  const remainingMs = Date.parse(resetsAt) - nowMs;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "reset pending";

  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  if (remainingMinutes >= 24 * 60) return `resets in ${Math.ceil(remainingMinutes / (24 * 60))}d`;
  if (remainingMinutes >= 60) return `resets in ${Math.ceil(remainingMinutes / 60)}h`;
  return `resets in ${remainingMinutes}m`;
}

export function formatWeeklyLimit(limit: ServerProviderUsageLimit, nowMs = Date.now()): string {
  const remaining = formatRemainingPercentage(limit.usedPercent);
  return limit.resetsAt
    ? `${remaining} · ${formatResetCountdown(limit.resetsAt, nowMs)}`
    : remaining;
}

export function isProviderUsageSnapshotStale(checkedAt: string, nowMs = Date.now()): boolean {
  const checkedAtMs = Date.parse(checkedAt);
  return !Number.isFinite(checkedAtMs) || nowMs - checkedAtMs > PROVIDER_USAGE_FRESHNESS_MS;
}

export function shouldRefreshWeeklyLimitOnOpen(input: {
  open: boolean;
  checkedAt: string;
  lastAttemptedCheckedAt: string | null;
  nowMs?: number;
}): boolean {
  return (
    input.open &&
    input.lastAttemptedCheckedAt !== input.checkedAt &&
    isProviderUsageSnapshotStale(input.checkedAt, input.nowMs)
  );
}
