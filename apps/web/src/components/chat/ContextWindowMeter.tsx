import { cn } from "~/lib/utils";
import { type ContextWindowSnapshot, formatContextWindowTokens } from "~/lib/contextWindow";
import type { ServerProviderUsageLimit } from "@t3tools/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatWeeklyLimit,
  selectWeeklyUsageLimit,
  shouldRefreshWeeklyLimitOnOpen,
  type WeeklyLimitProviderSnapshot,
} from "~/lib/providerUsageLimits";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

function formatPercentage(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  if (value < 10) {
    return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  }
  return `${Math.round(value)}%`;
}

export function ContextWindowMeter(props: {
  usage: ContextWindowSnapshot;
  providerDisplayName?: string | null;
  weeklyLimitProvider?: WeeklyLimitProviderSnapshot;
  onRefreshWeeklyLimit?: () => Promise<boolean>;
}) {
  const { usage, providerDisplayName, weeklyLimitProvider } = props;
  const weeklyLimit = useMemo(
    () => selectWeeklyUsageLimit(weeklyLimitProvider?.usageLimits ?? []),
    [weeklyLimitProvider?.usageLimits],
  );
  const [isRefreshingWeeklyLimit, setIsRefreshingWeeklyLimit] = useState(false);
  const [weeklyLimitRefreshFailed, setWeeklyLimitRefreshFailed] = useState(false);
  const lastRefreshSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    setIsRefreshingWeeklyLimit(false);
    setWeeklyLimitRefreshFailed(false);
  }, [weeklyLimitProvider?.checkedAt]);

  const handleOpenChange = (open: boolean) => {
    if (
      !weeklyLimitProvider ||
      !props.onRefreshWeeklyLimit ||
      !shouldRefreshWeeklyLimitOnOpen({
        open,
        checkedAt: weeklyLimitProvider.checkedAt,
        lastAttemptedCheckedAt: lastRefreshSnapshotRef.current,
      })
    ) {
      return;
    }

    lastRefreshSnapshotRef.current = weeklyLimitProvider.checkedAt;
    setWeeklyLimitRefreshFailed(false);
    setIsRefreshingWeeklyLimit(true);
    void props
      .onRefreshWeeklyLimit()
      .then((succeeded) => {
        setIsRefreshingWeeklyLimit(false);
        setWeeklyLimitRefreshFailed(!succeeded);
      })
      .catch(() => {
        setIsRefreshingWeeklyLimit(false);
        setWeeklyLimitRefreshFailed(true);
      });
  };
  const usedPercentage = formatPercentage(usage.usedPercentage);
  const normalizedPercentage = Math.max(0, Math.min(100, usage.usedPercentage ?? 0));
  const radius = 9.75;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedPercentage / 100) * circumference;
  const totalProcessedTokens = usage.totalProcessedTokens ?? null;
  const showTotalProcessed = totalProcessedTokens !== null && totalProcessedTokens > 0;
  const isOverloaded = normalizedPercentage > 90;
  const usageColor = isOverloaded
    ? "var(--color-red-500)"
    : "color-mix(in oklab, var(--color-muted-foreground) 72%, transparent)";

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={0}
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-transparent text-muted-foreground outline-none transition-colors",
              "hover:bg-accent data-[pressed]:bg-accent",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            )}
            aria-label={
              usage.maxTokens !== null && usedPercentage
                ? `Context window ${usedPercentage} used`
                : `Context window ${formatContextWindowTokens(usage.usedTokens)} tokens used`
            }
          >
            <span className="relative flex size-5 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="-rotate-90 absolute inset-0 size-full transform-gpu"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke="color-mix(in oklab, var(--color-muted-foreground) 24%, transparent)"
                  strokeWidth="3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke={usageColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                />
              </svg>
            </span>
          </button>
        }
      />
      <PopoverPopup
        tooltipStyle
        side="top"
        align="end"
        className="dropdown-glass w-64 max-w-none border-0! bg-secondary! p-0 shadow-none! before:hidden"
      >
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-muted-foreground text-xs">Context Window</div>
            {usage.maxTokens !== null && usedPercentage ? (
              <div className="text-[11px] tabular-nums text-muted-foreground/70">
                <span>{usedPercentage}</span>
                <span className="mx-1">·</span>
                <span>
                  {formatContextWindowTokens(usage.usedTokens)}/
                  {formatContextWindowTokens(usage.maxTokens ?? null)}
                </span>
              </div>
            ) : (
              <div className="text-[11px] tabular-nums text-muted-foreground/70">
                {formatContextWindowTokens(usage.usedTokens)}
              </div>
            )}
          </div>
          {usage.maxTokens !== null ? (
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(normalizedPercentage)}
              aria-label="Context window usage"
            >
              <div
                className="h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${normalizedPercentage}%`, backgroundColor: usageColor }}
              />
            </div>
          ) : null}
          {showTotalProcessed ? (
            <div className="flex items-center justify-between gap-3 text-[11px] leading-4">
              <span className="text-muted-foreground/60">Total processed</span>
              <span className="font-medium tabular-nums text-muted-foreground/80">
                {formatContextWindowTokens(totalProcessedTokens)}
              </span>
            </div>
          ) : null}
          {usage.compactsAutomatically ? (
            <div className="mt-1 text-pretty text-[11px] font-medium text-muted-foreground/70">
              {providerDisplayName ?? "It"} automatically compacts its context when needed.
            </div>
          ) : null}
          {weeklyLimitProvider ? (
            <WeeklyLimitRow
              {...(weeklyLimit ? { limit: weeklyLimit } : {})}
              loading={!weeklyLimit && isRefreshingWeeklyLimit}
              unavailable={!weeklyLimit && (!isRefreshingWeeklyLimit || weeklyLimitRefreshFailed)}
            />
          ) : null}
        </div>
      </PopoverPopup>
    </Popover>
  );
}

export function WeeklyLimitRow(props: {
  limit?: ServerProviderUsageLimit;
  loading?: boolean;
  unavailable?: boolean;
  nowMs?: number;
}) {
  const detail = props.limit
    ? formatWeeklyLimit(props.limit, props.nowMs)
    : props.loading
      ? "Loading…"
      : props.unavailable
        ? "unavailable"
        : "unavailable";

  return (
    <div className="mt-1 border-border/60 border-t pt-2 text-[11px] text-muted-foreground/70">
      <span>Weekly limit: </span>
      <span className="font-medium tabular-nums text-muted-foreground/80">{detail}</span>
    </div>
  );
}
