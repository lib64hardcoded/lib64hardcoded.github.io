import React, { createContext, useContext, useState, useEffect } from 'react';
import { showNotification } from '../lib/notifications';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('prodomo_theme');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to document
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('prodomo_theme', JSON.stringify(isDark));
    
    // Apply to document with a small delay to prevent flickering
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    console.log('ThemeContext: Theme applied:', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if the user hasn't explicitly set a preference
      if (localStorage.getItem('prodomo_theme') === null) {
        setIsDark(e.matches);
      }
    };
    
    // Add event listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // For older browsers
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      // Clean up with compatibility check
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // For older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const toggleTheme = () => {
    console.log('ThemeContext: Toggling theme from', isDark ? 'dark' : 'light', 'to', isDark ? 'light' : 'dark');
    setIsDark(!isDark);
    
    // Show theme change notification with a small delay to prevent UI lag
    setTimeout(() => {
      showNotification.themeChanged(!isDark ? 'dark' : 'light');
    }, 100);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};