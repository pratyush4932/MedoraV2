export const COLORS = {
  primary: '#1F8A8A', // Teal
  secondary: '#2D3748', // Dark Blue
  accent: '#B46943', // Warm Brown
  background: '#F8FAFA',
  white: '#FFFFFF',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
  },
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const ROUNDING = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
};

export const Colors = {
  light: {
    text: COLORS.text.primary,
    background: COLORS.background,
    tint: COLORS.primary,
    icon: COLORS.secondary,
    tabIconDefault: COLORS.text.secondary,
    tabIconSelected: COLORS.primary,
  },
  dark: {
    text: COLORS.white,
    background: COLORS.secondary,
    tint: COLORS.primary,
    icon: COLORS.white,
    tabIconDefault: COLORS.text.secondary,
    tabIconSelected: COLORS.primary,
  },
};

