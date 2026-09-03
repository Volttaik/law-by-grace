"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_KEY = "lbg-theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Light mode is the default. An explicit saved preference wins, so users
  // who previously chose dark mode stay in dark mode.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const resolved = stored === "dark" ? "dark" : "light";
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  function applyTheme(t: Theme) {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggle() {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
