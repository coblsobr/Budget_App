import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Theme system
 * ------------
 * A palette is a flat set of named colors. We ship a few presets and an editable
 * "Custom" palette. Everything in the app reads colors from useTheme(), so changing
 * the accent (or any color) in Settings recolors the whole app live.
 *
 * Persistence (saving the chosen palette between launches) and following the phone's
 * system light/dark setting can be layered on later — the shape below is ready for it.
 */

export type Palette = {
  name: string;
  mode: 'light' | 'dark';
  bg: string; // app background
  surface: string; // cards
  surfaceAlt: string; // subtle panels / inputs
  border: string;
  text: string; // primary text
  textMuted: string; // secondary text
  primary: string; // main accent (buttons, highlights)
  primarySoft: string; // tint of primary for backgrounds
  positive: string; // gains / income
  negative: string; // losses / spending
  warning: string;
  // Chart series colors (used for category breakdowns, allocations, etc.)
  chart: string[];
};

const ocean: Palette = {
  name: 'Ocean',
  mode: 'dark',
  bg: '#0e1525',
  surface: '#172033',
  surfaceAlt: '#1f2a40',
  border: '#28344d',
  text: '#eef2fb',
  textMuted: '#94a3c4',
  primary: '#4f8cff',
  primarySoft: '#1b2f52',
  positive: '#33d6a6',
  negative: '#ff6b6b',
  warning: '#ffc857',
  chart: ['#4f8cff', '#33d6a6', '#ffc857', '#c77dff', '#ff6b6b', '#56cfe1', '#f9a826'],
};

const midnight: Palette = {
  name: 'Midnight',
  mode: 'dark',
  bg: '#0c0c10',
  surface: '#16161c',
  surfaceAlt: '#1f1f28',
  border: '#2a2a36',
  text: '#f4f4f6',
  textMuted: '#9b9bab',
  primary: '#a78bfa',
  primarySoft: '#2a2342',
  positive: '#4ade80',
  negative: '#fb7185',
  warning: '#fbbf24',
  chart: ['#a78bfa', '#4ade80', '#fbbf24', '#38bdf8', '#fb7185', '#f472b6', '#34d399'],
};

const daylight: Palette = {
  name: 'Daylight',
  mode: 'light',
  bg: '#f5f6fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f7',
  border: '#e2e6ef',
  text: '#1a1f2b',
  textMuted: '#6b7488',
  primary: '#3b6fe0',
  primarySoft: '#e5edff',
  positive: '#12a978',
  negative: '#e0453b',
  warning: '#d99a00',
  chart: ['#3b6fe0', '#12a978', '#d99a00', '#8b5cf6', '#e0453b', '#0ea5e9', '#f97316'],
};

const forest: Palette = {
  name: 'Forest',
  mode: 'dark',
  bg: '#0d1512',
  surface: '#152019',
  surfaceAlt: '#1d2b22',
  border: '#27392e',
  text: '#eaf3ec',
  textMuted: '#92a99a',
  primary: '#34d399',
  primarySoft: '#16352a',
  positive: '#4ade80',
  negative: '#f87171',
  warning: '#facc15',
  chart: ['#34d399', '#facc15', '#60a5fa', '#f472b6', '#f87171', '#2dd4bf', '#a3e635'],
};

const sunset: Palette = {
  name: 'Sunset',
  mode: 'dark',
  bg: '#241023',
  surface: '#33182f',
  surfaceAlt: '#3f2038',
  border: '#4d2a44',
  text: '#fff1ea',
  textMuted: '#d3a7a0',
  primary: '#ff7e5f',
  primarySoft: '#3f2030',
  positive: '#5fd0a0',
  negative: '#ff5d73',
  warning: '#ffb347',
  chart: ['#ff7e5f', '#ffb347', '#ff5d73', '#c98bdb', '#ffd166', '#f78ca0', '#9b6dff'],
};

export const PRESETS: Palette[] = [ocean, midnight, forest, sunset, daylight];

type ThemeContextValue = {
  palette: Palette;
  presets: Palette[];
  setPreset: (name: string) => void;
  /** Override a single color on the live palette (used by the custom color editor). */
  setColor: (key: keyof Palette, value: string) => void;
  resetCustom: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<Palette>(ocean);

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette,
      presets: PRESETS,
      setPreset: (name) => {
        const found = PRESETS.find((p) => p.name === name);
        if (found) setPalette(found);
      },
      setColor: (key, val) =>
        setPalette((prev) => ({ ...prev, name: 'Custom', [key]: val })),
      resetCustom: () => setPalette(ocean),
    }),
    [palette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Typography scale — system fonts for a clean, modern, native feel. */
export const type = {
  display: 34,
  title: 22,
  heading: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
