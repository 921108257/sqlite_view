const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string) {
  const cached = formatterCache.get(locale);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale);
  } catch {
    // Unknown tag: fall back rather than throwing during render.
    formatter = new Intl.NumberFormat("en");
  }
  formatterCache.set(locale, formatter);
  return formatter;
}

/**
 * Locale-aware integer formatting for row/selection counts. English gets
 * thousands separators ("1,234"), and locales that use a different grouping
 * separator (de-DE "1.234", fr-FR "1 234") are handled by Intl.
 */
export function formatCount(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {}
) {
  if (!Number.isFinite(value)) return String(value);

  const formatter = getFormatter(locale);
  if (Object.keys(options).length === 0) return formatter.format(value);

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat("en", options).format(value);
  }
}
