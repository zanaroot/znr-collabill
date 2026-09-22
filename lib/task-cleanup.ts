import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  subMonths,
} from "date-fns";
import { extractDescriptionImageUrls } from "@/lib/description-image-url";

export const TASK_CLEANUP_JOB = "monthly_trash_cleanup";

const CATCH_UP_DAYS = 7;
const EDITOR_KEY_PREFIX = "editor/";
const STORAGE_PROXY_PREFIX = "/api/storage/";

const isLastDayOfMonth = (date: Date): boolean =>
  differenceInCalendarDays(date, endOfMonth(date)) === 0;

export const getCleanupPeriodKeys = (now: Date): string[] => {
  const periods: string[] = [];

  if (isLastDayOfMonth(now)) {
    periods.push(format(now, "yyyy-MM"));
  }

  if (now.getDate() <= CATCH_UP_DAYS) {
    const previousPeriod = format(subMonths(now, 1), "yyyy-MM");
    if (!periods.includes(previousPeriod)) {
      periods.push(previousPeriod);
    }
  }

  return periods;
};

export const extractStorageKeyFromUrl = (
  url: string,
  bucket: string,
): string | null => {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let path = trimmed;
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }

  path = path.split(/[?#]/, 1)[0] ?? path;

  if (path.startsWith(STORAGE_PROXY_PREFIX)) {
    path = `/${path.slice(STORAGE_PROXY_PREFIX.length)}`;
  }

  const bucketPrefix = `/${bucket}/`;
  if (!path.startsWith(bucketPrefix)) {
    return null;
  }

  const key = path.slice(bucketPrefix.length);
  if (!key.startsWith(EDITOR_KEY_PREFIX)) {
    return null;
  }
  if (key.includes("..")) {
    return null;
  }

  return key;
};

export const collectStorageKeysFromDescriptions = (
  descriptions: (string | null | undefined)[],
  bucket: string,
): string[] => {
  const keys = new Set<string>();

  for (const description of descriptions) {
    if (!description) {
      continue;
    }
    for (const url of extractDescriptionImageUrls(description)) {
      const key = extractStorageKeyFromUrl(url, bucket);
      if (key) {
        keys.add(key);
      }
    }
  }

  return [...keys];
};

export const selectReferencedKeys = (
  keys: string[],
  contents: (string | null | undefined)[],
): string[] => {
  const referenced = new Set<string>();

  for (const content of contents) {
    if (!content) {
      continue;
    }
    for (const key of keys) {
      if (content.includes(key)) {
        referenced.add(key);
      }
    }
  }

  return [...referenced];
};

export const selectDeletableKeys = (
  candidates: string[],
  referenced: string[],
): string[] => {
  const referencedSet = new Set(referenced);
  return candidates.filter((key) => !referencedSet.has(key));
};
