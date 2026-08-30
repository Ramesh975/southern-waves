import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ACCENT_COLORS = {
  blue: {
    name: 'Ocean Blue',
    primary: '#0055a4',
    hover: '#003f7f',
    light: '#3377cc'
  },
  green: {
    name: 'Emerald Green',
    primary: '#0f9f59',
    hover: '#0b7541',
    light: '#34b779'
  },
  red: {
    name: 'Crimson Red',
    primary: '#c8102e',
    hover: '#9e0c23',
    light: '#e8374f'
  },
  purple: {
    name: 'Royal Purple',
    primary: '#6f42c1',
    hover: '#563d7c',
    light: '#8c67d9'
  },
  orange: {
    name: 'Warm Amber',
    primary: '#d97706',
    hover: '#b45309',
    light: '#f59e0b'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check local storage or system preference
    const storedTheme = localStorage.getItem('southern_waves_theme');
    if (storedTheme) return storedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [styleMode] = useState('modern');

  // Theme Engine: 'default' (Current Theme) vs 'expressive' (Spread Accent / Material 3 Expressive)
  const [themeEngine, setThemeEngine] = useState(() => {
    return localStorage.getItem('southern_waves_engine') || 'default';
  });

  const [accent, setAccent] = useState(() => {
    return localStorage.getItem('southern_waves_accent') || 'blue';
  });

  useEffect(() => {
    // Set data-theme attribute on <html> element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('southern_waves_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Set data-theme-engine attribute on <html> element
    document.documentElement.setAttribute('data-theme-engine', themeEngine);
    document.documentElement.setAttribute('data-spread-accent', themeEngine === 'expressive' ? 'true' : 'false');
    localStorage.setItem('southern_waves_engine', themeEngine);
  }, [themeEngine]);

  useEffect(() => {
    // Always set data-style to modern
    document.documentElement.setAttribute('data-style', 'modern');
    localStorage.setItem('southern_waves_style', 'modern');
  }, []);

  useEffect(() => {
    // Dynamically update accent colors in root CSS variables
    const selected = ACCENT_COLORS[accent] || ACCENT_COLORS.blue;
    document.documentElement.style.setProperty('--accent-color', selected.primary);
    document.documentElement.style.setProperty('--accent-color-hover', selected.hover);
    document.documentElement.style.setProperty('--accent-color-light', selected.light);
    localStorage.setItem('southern_waves_accent', accent);
  }, [accent]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'black';
      return 'light';
    });
  };

  const toggleThemeEngine = () => {
    setThemeEngine((prev) => (prev === 'expressive' ? 'default' : 'expressive'));
  };

  const toggleStyleMode = () => {};
  const setStyleMode = () => {};

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      styleMode, 
      toggleStyleMode, 
      setStyleMode, 
      themeEngine,
      setThemeEngine,
      toggleThemeEngine,
      accent, 
      setAccent, 
      ACCENT_COLORS 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
