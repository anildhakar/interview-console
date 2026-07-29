"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";

interface ThemeContextValue {
  theme: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: React.ReactNode;
  initialTheme?: string;
}) {
  const [theme, setThemeState] = useState(initialTheme);

  const setTheme = useCallback((id: string) => {
    if (!THEME_IDS.includes(id)) return;
    setThemeState(id);
    document.documentElement.setAttribute("data-theme", id);
    // Persist in a cookie so the server renders the same theme on next load.
    document.cookie = `${THEME_STORAGE_KEY}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
