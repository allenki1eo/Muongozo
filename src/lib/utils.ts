import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StepGuide } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return (
    'mzk_' +
    Array.from({ length: 32 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  );
}

/** Splits Claude's reply into clean text + optional step guide parsed from trailing JSON block. */
export function parseAssistantMessage(raw: string): {
  text: string;
  stepGuide?: StepGuide;
} {
  const match = raw.match(/```json\s*([\s\S]*?)```\s*$/);
  if (!match) return { text: raw.trim() };

  try {
    const parsed = JSON.parse(match[1]) as { stepGuide?: StepGuide };
    const text = raw.slice(0, match.index).trim();
    return { text, stepGuide: parsed.stepGuide };
  } catch {
    return { text: raw.trim() };
  }
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
