import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Primary Color: Ocean Blue only
export const ACCENT_COLORS = {
  blue: {
    name: 'Ocean Blue',
    primary: '#0055a4',
    hover: '#003f7f',
    light: '#3377cc',
    darkPrimary: '#38bdf8',
    darkHover: '#0ea5e9',
    darkLight: '#7dd3fc'
  }
};

export const THEME_MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Light Dark' },
  { id: 'black', label: 'Pure Dark' }
];

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

  // Accent is locked to Primary Blue
  const accent = 'blue';

  useEffect(() => {
    // Set data-theme attribute on <html> element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('southern_waves_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Spread Accent / Theme Engine removed: clean up any legacy attributes and localStorage
    document.documentElement.removeAttribute('data-theme-engine');
    document.documentElement.removeAttribute('data-spread-accent');
    localStorage.removeItem('southern_waves_engine');
    localStorage.removeItem('southern_waves_accent');
  }, []);

  useEffect(() => {
    // Always set data-style to modern
    document.documentElement.setAttribute('data-style', 'modern');
    localStorage.setItem('southern_waves_style', 'modern');
  }, []);

  useEffect(() => {
    // Dynamically update Ocean Blue primary colors in root CSS variables
    const selected = ACCENT_COLORS.blue;
    const isDark = theme === 'dark' || theme === 'black';
    const primary = isDark ? selected.darkPrimary : selected.primary;
    const hover = isDark ? selected.darkHover : selected.hover;
    const light = isDark ? selected.darkLight : selected.light;

    document.documentElement.style.setProperty('--accent-color', primary);
    document.documentElement.style.setProperty('--accent-color-hover', hover);
    document.documentElement.style.setProperty('--accent-color-light', light);
    document.documentElement.style.setProperty('--color-text-on-accent', '#ffffff');
  }, [theme]);

  // Cycle: Light -> Light Dark ('dark') -> Pure Dark ('black') -> Light ('light')
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'black';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      styleMode, 
      toggleStyleMode: () => {}, 
      setStyleMode: () => {}, 
      themeEngine: 'default',
      setThemeEngine: () => {},
      toggleThemeEngine: () => {},
      accent, 
      setAccent: () => {}, 
      ACCENT_COLORS,
      THEME_MODES
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
