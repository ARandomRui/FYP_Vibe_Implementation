import { addDays, eachDayOfInterval, format, isAfter, startOfDay, subDays } from "date-fns";

export const WINDOW_DAYS = 30;

export function getWindowRange(days = WINDOW_DAYS) {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);

  return { start, end };
}

export function toFinnhubDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export function dateKey(date: Date | string) {
  return format(new Date(date), "yyyy-MM-dd");
}

export function windowDays(start: Date, end: Date) {
  return eachDayOfInterval({ start, end: addDays(end, 0) });
}

export function chunkDateRange(start: Date, end: Date, chunkDays: number) {
  const chunks: Array<{ start: Date; end: Date }> = [];
  let cursor = start;

  while (!isAfter(cursor, end)) {
    const chunkEnd = addDays(cursor, chunkDays - 1);
    chunks.push({
      start: cursor,
      end: isAfter(chunkEnd, end) ? end : chunkEnd
    });
    cursor = addDays(chunkEnd, 1);
  }

  return chunks;
}

export function hoursSince(date?: Date | null) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}
