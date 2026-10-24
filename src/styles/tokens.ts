/**
 * The Project Graveyard — Central Design Tokens
 * Midnight + Mint + Warm Amber Design System
 * Programmatic access to CSS variables & theme constants
 */

export const THEME_TOKENS = {
  light: {
    brand: '#0D8262',
    brandHover: '#09684E',
    brandSoft: '#E2F7F0',
    brandContrast: '#FFFFFF',

    accent: '#D97706',
    accentHover: '#B45309',
    accentSoft: '#FEF3C7',
    accentContrast: '#FFFFFF',

    page: '#F4F7F9',
    sidebar: '#FFFFFF',
    topbar: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSubtle: '#EBF0F5',
    surfaceHover: '#E3EAF2',
    navSelected: '#E2F7F0',

    text: '#101820',
    textSecondary: '#485D6F',
    textMuted: '#6B8094',
    textOnBrand: '#FFFFFF',

    border: '#D2DCE6',
    borderStrong: '#AFC0D2',
    focus: '#0D8262',

    success: '#0D8262',
    successSoft: '#E2F7F0',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#C53030',
    dangerSoft: '#FDE8E8',
  },
  dark: {
    brand: '#42E8B4',
    brandHover: '#65F0C5',
    brandSoft: '#203D3A',
    brandContrast: '#0B1917',

    accent: '#FFB86B',
    accentHover: '#FFA747',
    accentSoft: 'rgba(255, 184, 107, 0.16)',
    accentContrast: '#1E150B',

    page: '#101820',
    sidebar: '#151F29',
    topbar: '#151F29',
    surface: '#202B36',
    surfaceSubtle: '#273541',
    surfaceHover: '#2C3B49',
    navSelected: '#203D3A',

    text: '#F5F7FA',
    textSecondary: '#AAB8C5',
    textMuted: '#788B9E',
    textOnBrand: '#0B1917',

    border: '#344452',
    borderStrong: '#4E6377',
    focus: '#42E8B4',

    success: '#42E8B4',
    successSoft: '#1B3831',
    warning: '#FFB86B',
    warningSoft: '#382A1B',
    danger: '#FF7B89',
    dangerSoft: '#3E1E24',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function getThemeTokens(mode: ThemeMode) {
  return THEME_TOKENS[mode] || THEME_TOKENS.light;
}
