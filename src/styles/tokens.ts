/**
 * The Project Graveyard — Central Design Tokens
 * Luminous Purple / Magenta (OmniCraft-inspired) Design System
 * Programmatic access to CSS variables & theme constants
 */

export const THEME_TOKENS = {
  light: {
    brand: '#7A20D4',
    brandHover: '#6716B8',
    brandSoft: '#F1E8FD',
    brandContrast: '#FFFFFF',

    accent: '#C026D3',
    accentHover: '#A21CAF',
    accentSoft: '#FDF2F8',
    accentContrast: '#FFFFFF',

    page: '#F6F4FA',
    sidebar: '#FFFFFF',
    topbar: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSubtle: '#EFEBF6',
    surfaceRaised: '#F1EBF7',
    surfaceHover: '#E8E2F2',
    input: '#FFFFFF',
    navSelected: '#F1E8FD',

    text: '#1A1326',
    textBody: '#2E243D',
    textSecondary: '#594E6B',
    textMuted: '#7F7394',
    textTertiary: '#7F7394',
    textDisabled: '#A398B5',
    textOnBrand: '#FFFFFF',

    border: '#D8CFE6',
    borderSubtle: '#EAE3F2',
    borderStrong: '#B8A9D1',
    focus: '#7A20D4',

    statusActive: '#0891B2',
    statusActiveSoft: '#ECFEFF',
    statusPaused: '#D97706',
    statusPausedSoft: '#FEF3C7',
    success: '#16A34A',
    successSoft: '#DCFCE7',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
  },
  dark: {
    brand: '#8B2FE8',
    brandHover: '#9D47F4',
    brandSoft: '#2D1D42',
    brandContrast: '#FFFFFF',

    accent: '#C026D3',
    accentHover: '#D946EF',
    accentSoft: 'rgba(192, 38, 211, 0.16)',
    accentContrast: '#FFFFFF',

    page: '#050408',
    sidebar: '#17131F',
    topbar: '#17131F',
    surface: '#211A2D',
    surfaceSubtle: '#2A2039',
    surfaceRaised: '#2A2039',
    surfaceHover: '#322644',
    input: '#261E34',
    navSelected: '#2D1D42',

    text: '#F8F7FB',
    textBody: '#E1DCE9',
    textSecondary: '#BDB5CC',
    textMuted: '#A49AAF',
    textTertiary: '#A49AAF',
    textDisabled: '#6E647E',
    textOnBrand: '#FFFFFF',

    border: '#493B5B',
    borderSubtle: '#382B49',
    borderStrong: '#65537D',
    focus: '#A855F7',

    statusActive: '#38BDF8',
    statusActiveSoft: 'rgba(56, 189, 248, 0.16)',
    statusPaused: '#FBBF24',
    statusPausedSoft: 'rgba(251, 191, 36, 0.16)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.16)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    danger: '#F87171',
    dangerSoft: 'rgba(248, 113, 113, 0.18)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function getThemeTokens(mode: ThemeMode) {
  return THEME_TOKENS[mode] || THEME_TOKENS.dark;
}
