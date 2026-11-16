export function omitUndefined(object: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
