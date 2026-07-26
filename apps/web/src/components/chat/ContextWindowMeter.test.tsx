import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { WeeklyLimitRow } from "./ContextWindowMeter";

describe("WeeklyLimitRow", () => {
  it("renders normalized weekly usage", () => {
    const markup = renderToStaticMarkup(
      <WeeklyLimitRow
        limit={{
          usedPercent: 21,
          windowDurationMinutes: 10_080,
          resetsAt: "2026-08-01T12:00:00.000Z",
        }}
        nowMs={Date.parse("2026-07-26T12:00:00.000Z")}
      />,
    );
    expect(markup).toContain("Weekly limit:");
    expect(markup).toContain("79% left");
    expect(markup).toContain("resets in 6d");
  });

  it("renders loading and unavailable states", () => {
    expect(renderToStaticMarkup(<WeeklyLimitRow loading />)).toContain("Loading…");
    expect(renderToStaticMarkup(<WeeklyLimitRow unavailable />)).toContain("unavailable");
  });

  it("keeps cached data visible even after a refresh failure", () => {
    const markup = renderToStaticMarkup(
      <WeeklyLimitRow limit={{ usedPercent: 21, windowDurationMinutes: 10_080 }} unavailable />,
    );
    expect(markup).toContain("79% left");
    expect(markup).not.toContain("unavailable");
  });
});
