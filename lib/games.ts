// ===== lib/games.ts — datos mock compartidos =====

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de cover- ya definida en globals.css
  color: GameColor;
  best: number;
  plays: number;
}

export function formatPlays(plays: number): string {
  if (plays < 1000) return String(plays);
  return `${(plays / 1000).toFixed(1)}K`;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
