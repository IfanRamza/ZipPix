import { MAX_PALETTE_COLORS, MIN_PALETTE_COLORS } from '@/lib/palette';
import type { CompressionSettings, SupportedFormat } from '@/types';
import { createJSONStorage, type PersistOptions, type StateStorage } from 'zustand/middleware';

const FORMATS: readonly SupportedFormat[] = ['jpeg', 'png', 'webp', 'avif'];
const SCALES = [25, 50, 75, 100, 200];
/** Upper bound for target-size mode (the control clamps input to this as well) */
export const MAX_TARGET_KB = 100_000;

type SettingsKey = keyof CompressionSettings;

function isIntIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/**
 * Keep only well-formed values: storage can hold anything (an older version,
 * a manual edit), and a bad format or quality must not reach the encoder.
 */
export function sanitizeSettings(raw: unknown): Partial<CompressionSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<CompressionSettings> = {};
  if (FORMATS.includes(r.format as SupportedFormat)) out.format = r.format as SupportedFormat;
  if (isIntIn(r.quality, 1, 100)) out.quality = r.quality;
  if (SCALES.includes(r.scale as number)) out.scale = r.scale as number;
  if (typeof r.maintainAspectRatio === 'boolean') out.maintainAspectRatio = r.maintainAspectRatio;
  if (isIntIn(r.targetSize, 1024, MAX_TARGET_KB * 1024)) out.targetSize = r.targetSize;
  if (isIntIn(r.paletteColors, MIN_PALETTE_COLORS, MAX_PALETTE_COLORS)) {
    out.paletteColors = r.paletteColors;
  }
  return out;
}

function pick(settings: Partial<CompressionSettings>, keys: readonly SettingsKey[]) {
  return Object.fromEntries(
    keys.filter((k) => settings[k] !== undefined).map((k) => [k, settings[k]]),
  ) as Partial<CompressionSettings>;
}

type PersistedSettings = { settings: Partial<CompressionSettings> };

/**
 * localStorage can be missing (tests), blocked or full (private mode, quota).
 * Settings are a convenience, so every failure just means "not remembered".
 */
const safeLocalStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not remembered this time
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to remove
    }
  },
};

/**
 * Remember the chosen `keys` of a store's settings across visits.
 * Per-image values (explicit width/height) are never stored.
 */
export function persistSettings<S extends { settings: CompressionSettings }>(
  name: string,
  keys: readonly SettingsKey[],
): PersistOptions<S, PersistedSettings> {
  return {
    name,
    version: 1,
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: (state) => ({ settings: pick(state.settings, keys) }),
    merge: (persisted, current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...pick(sanitizeSettings((persisted as PersistedSettings | undefined)?.settings), keys),
      },
    }),
  };
}
