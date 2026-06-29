// ─── Theme Provider ──────────────────────────────────────────────
import React, { createContext, useContext } from 'react';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#4F46E5',
    secondary: '#6B7280',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#818CF8',
    secondary: '#9CA3AF',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function ThemeProvider({
  children,
  theme = 'light',
  onToggleTheme,
}: ThemeProviderProps) {
  const currentTheme = themes[theme];
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    onToggleTheme?.();
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
