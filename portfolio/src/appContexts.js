import { createContext, useContext } from "react";

export const RouteContext = createContext(null);
export const ScrollContext = createContext(null);
export const ThemeContext = createContext(null);
export const SandboxContext = createContext(null);

export const useRoute = () => useContext(RouteContext);
export const useScrollContainer = () => useContext(ScrollContext);
export const useTheme = () => useContext(ThemeContext);
export const useSandbox = () => useContext(SandboxContext);
