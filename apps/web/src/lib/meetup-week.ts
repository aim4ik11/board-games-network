export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Week starts Sunday (matches common US calendar layout). */
export function startOfWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function endOfWeekSaturday(startSunday: Date): Date {
  const e = new Date(startSunday);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function parseLocalDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function toIsoRangeFromLocalWeek(sundayKey: string): {
  from: string;
  to: string;
} {
  const start = parseLocalDayKey(sundayKey);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export const WEEKDAY_LABELS_SUN = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

export type MeetupListLike = {
  id: string;
  scheduledAt: string;
};

export function groupMeetupsByLocalDay<T extends MeetupListLike>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const m of items) {
    const key = formatLocalDateKey(new Date(m.scheduledAt));
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }
  return map;
}

export function monthGridCells(year: number, monthIndex: number): (Date | null)[] {
  const first = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, monthIndex, d, 12, 0, 0, 0));
  }
  return cells;
}

/** First hour label row (inclusive), local time. */
export const CALENDAR_DAY_START_HOUR = 6;
/** One past the last hour row (exclusive), local time. */
export const CALENDAR_DAY_END_HOUR_EXCLUSIVE = 23;
export const CALENDAR_HOUR_ROW_PX = 48;

export function calendarHourRows(): number[] {
  const out: number[] = [];
  for (
    let h = CALENDAR_DAY_START_HOUR;
    h < CALENDAR_DAY_END_HOUR_EXCLUSIVE;
    h += 1
  ) {
    out.push(h);
  }
  return out;
}

export function calendarBodyHeightPx(): number {
  return calendarHourRows().length * CALENDAR_HOUR_ROW_PX;
}

export function formatCalendarHourLabel(hour24: number): string {
  const d = new Date(2000, 0, 1, hour24, 0, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    hour12: true,
  });
}

/** When the API has no end time, use this for vertical size only. */
export const CALENDAR_EVENT_DEFAULT_DURATION_MIN = 120;

export function getCalendarEventLayout(
  scheduledAt: Date,
  durationMinutes: number,
): { top: number; height: number } | null {
  const startMin = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const viewStart = CALENDAR_DAY_START_HOUR * 60;
  const viewEnd = CALENDAR_DAY_END_HOUR_EXCLUSIVE * 60;
  const eventEnd = startMin + durationMinutes;
  if (eventEnd <= viewStart || startMin >= viewEnd) {
    return null;
  }
  const clipStart = Math.max(startMin, viewStart);
  const clipEnd = Math.min(eventEnd, viewEnd);
  const top = ((clipStart - viewStart) / 60) * CALENDAR_HOUR_ROW_PX;
  const height = Math.max(
    ((clipEnd - clipStart) / 60) * CALENDAR_HOUR_ROW_PX,
    28,
  );
  return { top, height };
}
