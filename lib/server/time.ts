import "server-only";

export const workspaceTimezone =
  process.env.Q_INTELLIGENCE_TIMEZONE?.trim() || "America/Toronto";

export function toLocalDate(
  value: string | Date = new Date(),
  timezone = workspaceTimezone,
) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Unable to resolve a local date in ${timezone}`);
  }
  return `${year}-${month}-${day}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    ) &&
    Number.isFinite(new Date(value).getTime())
  );
}
