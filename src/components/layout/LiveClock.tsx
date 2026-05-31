import { useEffect, useState } from "react";
import { formatClockTime } from "./liveClockFormat";

function formatWelcomeDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Updates every second; state is isolated so parent trees do not re-render. */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = formatWelcomeDate(now);
  const timeLabel = formatClockTime(now);

  return (
    <time
      dateTime={now.toISOString()}
      className="inline-flex flex-wrap items-baseline gap-x-2 type-muted"
      aria-label={`${dateLabel}, ${timeLabel}`}
    >
      <span>{dateLabel}</span>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <span className="type-code type-emphasis tabular-nums">{timeLabel}</span>
    </time>
  );
}
