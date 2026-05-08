import crypto from 'crypto';

function normalizeForHashing(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForHashing);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForHashing(
          (value as Record<string, unknown>)[key],
        );
        return acc;
      }, {});
  }

  return value;
}

export function hashData(value: unknown): string {
  const normalized =
    typeof value === 'string'
      ? value
      : JSON.stringify(normalizeForHashing(value));

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function createAuditId(): string {
  return crypto.randomUUID();
}
