"use client";

export function toFriendlyMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (/permission|forbidden|unauthorized/i.test(message)) {
    return 'Nie masz dostępu do tej akcji.';
  }
  return message || fallback;
}
