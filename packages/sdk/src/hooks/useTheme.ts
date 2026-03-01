import { useState, useCallback } from "react";

export type ThemeMode = "dark" | "light" | "system";

export interface UseThemeResult {
    isDark: boolean;
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

/**
 * Hook for theme management in mini-apps.
 * Defaults to dark mode (Keystone OS aesthetic).
 * In the Studio iframe, the host controls the actual theme.
 */
export function useTheme(): UseThemeResult {
    const [theme, setThemeState] = useState<ThemeMode>("dark");

    const isDark = theme === "dark" || (theme === "system" && true);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    const setTheme = useCallback((newTheme: ThemeMode) => {
        setThemeState(newTheme);
    }, []);

    return { isDark, theme, toggleTheme, setTheme };
}
