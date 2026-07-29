export interface ThemeDef {
  id: string;
  name: string;
  mode: "light" | "dark";
  /** [background, card, primary, accent] preview swatches */
  swatches: [string, string, string, string];
}

export const THEMES: ThemeDef[] = [
  {
    id: "daylight",
    name: "Daylight",
    mode: "light",
    swatches: ["#ffffff", "#f5f5f5", "#5b62d6", "#e7e8f7"],
  },
  {
    id: "latte",
    name: "Latte",
    mode: "light",
    swatches: ["#faf7f0", "#f0e9db", "#a5673f", "#ece0cf"],
  },
  {
    id: "graphite",
    name: "Graphite",
    mode: "dark",
    swatches: ["#2b2b2b", "#363636", "#8a8ff0", "#3d3d4a"],
  },
  {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    swatches: ["#1c2233", "#242c40", "#5aa2f0", "#2f3a55"],
  },
  {
    id: "forest",
    name: "Forest",
    mode: "dark",
    swatches: ["#1e2620", "#26302a", "#4fbf87", "#2f3d34"],
  },
  {
    id: "amoled",
    name: "Amoled",
    mode: "dark",
    swatches: ["#000000", "#161616", "#4fd0e0", "#1e2b2e"],
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = "graphite";
export const THEME_STORAGE_KEY = "ic-theme";
